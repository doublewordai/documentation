use arrow::array::{Array, ArrayRef, StringArray};
use arrow::datatypes::{DataType, Field};
use datafusion::common::{Result as DFResult, ScalarValue};
use datafusion::logical_expr::function::{AccumulatorArgs, StateFieldsArgs};
use datafusion::logical_expr::{
    Accumulator, AggregateUDFImpl, Signature, TypeSignature, Volatility,
};
use indicatif::{ProgressBar, ProgressStyle};
use std::any::Any;
use std::time::Duration;

use crate::client::LlmClient;
use crate::validation::validate_fold_template;

/// LLM Aggregate function with optional map-reduce
///
/// Two forms:
///   llm_agg(column, reduce_prompt)              -- reduce only
///   llm_agg(column, reduce_prompt, map_prompt)  -- map then reduce
///
/// - reduce_prompt: Uses {0} and {1} for combining pairs in tree-reduce
/// - map_prompt: Optional, uses {0} to transform each value before reduce
///
/// Examples:
///   -- Reduce only (combine raw values)
///   SELECT llm_agg(content, 'Combine:\n{0}\n---\n{1}') FROM docs;
///
///   -- Map then reduce
///   SELECT llm_agg(
///     content,
///     'Combine summaries:\n{0}\n---\n{1}',
///     'Summarize: {0}'
///   ) FROM docs;
#[derive(Debug)]
pub struct LlmAggUdaf {
    signature: Signature,
    client: LlmClient,
}

impl LlmAggUdaf {
    pub fn new(client: LlmClient) -> Self {
        Self {
            // Accept 2 args (reduce only) or 3 args (map + reduce)
            signature: Signature::new(
                TypeSignature::OneOf(vec![
                    TypeSignature::Exact(vec![DataType::Utf8, DataType::Utf8]),
                    TypeSignature::Exact(vec![DataType::Utf8, DataType::Utf8, DataType::Utf8]),
                ]),
                Volatility::Volatile,
            ),
            client,
        }
    }
}

impl AggregateUDFImpl for LlmAggUdaf {
    fn as_any(&self) -> &dyn Any {
        self
    }

    fn name(&self) -> &str {
        "llm_agg"
    }

    fn signature(&self) -> &Signature {
        &self.signature
    }

    fn return_type(&self, _arg_types: &[DataType]) -> DFResult<DataType> {
        Ok(DataType::Utf8)
    }

    fn accumulator(&self, args: AccumulatorArgs) -> DFResult<Box<dyn Accumulator>> {
        let has_map = args.exprs.len() == 3;
        Ok(Box::new(LlmAggAccumulator::new(self.client.clone(), has_map)))
    }

    fn state_fields(&self, _args: StateFieldsArgs) -> DFResult<Vec<Field>> {
        Ok(vec![
            Field::new("reduce_prompt", DataType::Utf8, true),
            Field::new("map_prompt", DataType::Utf8, true),
            Field::new("values", DataType::Utf8, true), // JSON array
        ])
    }
}

#[derive(Debug)]
struct LlmAggAccumulator {
    client: LlmClient,
    reduce_prompt: Option<String>,
    map_prompt: Option<String>,
    values: Vec<String>,
    has_map: bool,
}

impl LlmAggAccumulator {
    fn new(client: LlmClient, has_map: bool) -> Self {
        Self {
            client,
            reduce_prompt: None,
            map_prompt: None,
            values: Vec::new(),
            has_map,
        }
    }

    fn tree_reduce(
        &self,
        mut items: Vec<String>,
        progress: &ProgressBar,
    ) -> DFResult<String> {
        let reduce_prompt = self.reduce_prompt.as_ref().ok_or_else(|| {
            datafusion::error::DataFusionError::Execution("Missing reduce prompt".to_string())
        })?;

        if items.is_empty() {
            return Ok(String::new());
        }

        if items.len() == 1 {
            return Ok(items.remove(0));
        }

        let client = self.client.clone();
        let template = reduce_prompt.clone();

        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                let mut level = 1u64;
                while items.len() > 1 {
                    let mut prompts = Vec::new();
                    let mut new_items = Vec::new();

                    let mut i = 0;
                    while i < items.len() {
                        if i + 1 < items.len() {
                            let prompt = template
                                .replace("{0}", &items[i])
                                .replace("{1}", &items[i + 1]);
                            prompts.push(prompt);
                            i += 2;
                        } else {
                            new_items.push(items[i].clone());
                            i += 1;
                        }
                    }

                    if !prompts.is_empty() {
                        progress.set_message(format!(
                            "reduce level {} ({} → {})",
                            level,
                            items.len(),
                            prompts.len() + new_items.len()
                        ));
                        let results = client.process_prompts_quiet(prompts).await.map_err(|e| {
                            datafusion::error::DataFusionError::Execution(format!(
                                "LLM API error during reduce: {}",
                                e
                            ))
                        })?;
                        new_items.extend(results);
                    }

                    items = new_items;
                    level += 1;
                }

                Ok(items.remove(0))
            })
        })
    }
}

impl Accumulator for LlmAggAccumulator {
    fn update_batch(&mut self, values: &[ArrayRef]) -> DFResult<()> {
        // values[0] = column, values[1] = reduce_prompt, values[2] = map_prompt (optional)
        let content = values[0]
            .as_any()
            .downcast_ref::<StringArray>()
            .ok_or_else(|| {
                datafusion::error::DataFusionError::Execution(
                    "First argument (column) must be string".to_string(),
                )
            })?;

        let reduce_prompts = values[1]
            .as_any()
            .downcast_ref::<StringArray>()
            .ok_or_else(|| {
                datafusion::error::DataFusionError::Execution(
                    "Second argument (reduce_prompt) must be string".to_string(),
                )
            })?;

        // Capture reduce prompt from first non-null
        for i in 0..reduce_prompts.len() {
            if self.reduce_prompt.is_none() && !reduce_prompts.is_null(i) {
                self.reduce_prompt = Some(reduce_prompts.value(i).to_string());
                break;
            }
        }

        // Capture map prompt if provided
        if self.has_map && values.len() > 2 {
            let map_prompts = values[2]
                .as_any()
                .downcast_ref::<StringArray>()
                .ok_or_else(|| {
                    datafusion::error::DataFusionError::Execution(
                        "Third argument (map_prompt) must be string".to_string(),
                    )
                })?;

            for i in 0..map_prompts.len() {
                if self.map_prompt.is_none() && !map_prompts.is_null(i) {
                    self.map_prompt = Some(map_prompts.value(i).to_string());
                    break;
                }
            }
        }

        // Collect values
        for i in 0..content.len() {
            if !content.is_null(i) {
                self.values.push(content.value(i).to_string());
            }
        }

        Ok(())
    }

    fn evaluate(&mut self) -> DFResult<ScalarValue> {
        if self.values.is_empty() {
            return Ok(ScalarValue::Utf8(None));
        }

        let reduce_prompt = self.reduce_prompt.as_ref().ok_or_else(|| {
            datafusion::error::DataFusionError::Execution("Missing reduce prompt".to_string())
        })?;

        // Validate reduce prompt
        if let Err(e) = validate_fold_template(reduce_prompt) {
            return Err(datafusion::error::DataFusionError::Execution(format!(
                "Invalid reduce prompt: {}. Must contain {{0}} and {{1}} for combining pairs.",
                e
            )));
        }

        // Validate map prompt if provided
        if let Some(ref map_prompt) = self.map_prompt {
            if !map_prompt.contains("{0}") {
                return Err(datafusion::error::DataFusionError::Execution(
                    "Map prompt must contain {0} placeholder".to_string(),
                ));
            }
        }

        let progress = ProgressBar::new_spinner();
        progress.set_style(
            ProgressStyle::default_spinner()
                .tick_chars("⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏")
                .template("{spinner:.cyan} llm_agg: {msg}")
                .unwrap(),
        );
        progress.enable_steady_tick(Duration::from_millis(80));

        let item_count = self.values.len();

        // Step 1: Map if map_prompt provided, otherwise use raw values
        let items = if let Some(ref map_prompt) = self.map_prompt {
            progress.set_message(format!("mapping {} items...", item_count));

            let prompts: Vec<String> = self
                .values
                .iter()
                .map(|v| map_prompt.replace("{0}", v))
                .collect();

            tokio::task::block_in_place(|| {
                tokio::runtime::Handle::current().block_on(async {
                    self.client.process_prompts_quiet(prompts).await
                })
            })
            .map_err(|e| {
                progress.finish_with_message(format!("✗ map failed: {}", e));
                datafusion::error::DataFusionError::Execution(format!(
                    "LLM API error during map: {}",
                    e
                ))
            })?
        } else {
            progress.set_message(format!("reducing {} items...", item_count));
            self.values.clone()
        };

        // Step 2: Tree-reduce
        let result = self.tree_reduce(items, &progress)?;

        progress.finish_with_message(format!("✓ complete ({} items)", item_count));

        Ok(ScalarValue::Utf8(Some(result)))
    }

    fn size(&self) -> usize {
        std::mem::size_of_val(self)
            + self.values.iter().map(|s| s.len()).sum::<usize>()
            + self.reduce_prompt.as_ref().map(|s| s.len()).unwrap_or(0)
            + self.map_prompt.as_ref().map(|s| s.len()).unwrap_or(0)
    }

    fn state(&mut self) -> DFResult<Vec<ScalarValue>> {
        let values_json = serde_json::to_string(&self.values).unwrap_or_default();
        Ok(vec![
            ScalarValue::Utf8(self.reduce_prompt.clone()),
            ScalarValue::Utf8(self.map_prompt.clone()),
            ScalarValue::Utf8(Some(values_json)),
        ])
    }

    fn merge_batch(&mut self, states: &[ArrayRef]) -> DFResult<()> {
        if states.len() != 3 {
            return Err(datafusion::error::DataFusionError::Execution(
                "Invalid state for llm_agg".to_string(),
            ));
        }

        let reduce_prompts = states[0].as_any().downcast_ref::<StringArray>().unwrap();
        let map_prompts = states[1].as_any().downcast_ref::<StringArray>().unwrap();
        let values_jsons = states[2].as_any().downcast_ref::<StringArray>().unwrap();

        for i in 0..reduce_prompts.len() {
            if self.reduce_prompt.is_none() && !reduce_prompts.is_null(i) {
                self.reduce_prompt = Some(reduce_prompts.value(i).to_string());
            }
            if self.map_prompt.is_none() && !map_prompts.is_null(i) {
                self.map_prompt = Some(map_prompts.value(i).to_string());
            }
            if !values_jsons.is_null(i) {
                let json = values_jsons.value(i);
                if let Ok(vals) = serde_json::from_str::<Vec<String>>(json) {
                    self.values.extend(vals);
                }
            }
        }

        Ok(())
    }
}
