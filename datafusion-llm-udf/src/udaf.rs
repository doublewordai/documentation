use arrow::array::{Array, ArrayRef, StringArray};
use arrow::datatypes::{DataType, Field};
use datafusion::common::{Result as DFResult, ScalarValue};
use datafusion::logical_expr::function::{AccumulatorArgs, StateFieldsArgs};
use datafusion::logical_expr::{
    Accumulator, AggregateUDFImpl, Signature, TypeSignature, Volatility,
};
use std::any::Any;

use crate::client::LlmClient;
use crate::validation::{validate_fold_template, validate_map_template};

/// Parallel fold UDAF: llm_fold(fold_template, map_template, column)
///
/// 1. Maps each row through map_template: "Summarize: {0}"
/// 2. Tree-reduces results pairwise using fold_template: "Combine:\n{0}\n{1}"
///
/// Example:
///   SELECT llm_fold(
///     'Combine these summaries:\n{0}\n---\n{1}',
///     'Summarize this text: {0}',
///     content
///   ) FROM documents;
#[derive(Debug)]
pub struct LlmFoldUdaf {
    signature: Signature,
    client: LlmClient,
}

impl LlmFoldUdaf {
    pub fn new(client: LlmClient) -> Self {
        Self {
            signature: Signature::new(
                TypeSignature::Exact(vec![DataType::Utf8, DataType::Utf8, DataType::Utf8]),
                Volatility::Volatile,
            ),
            client,
        }
    }
}

impl AggregateUDFImpl for LlmFoldUdaf {
    fn as_any(&self) -> &dyn Any {
        self
    }

    fn name(&self) -> &str {
        "llm_fold"
    }

    fn signature(&self) -> &Signature {
        &self.signature
    }

    fn return_type(&self, _arg_types: &[DataType]) -> DFResult<DataType> {
        Ok(DataType::Utf8)
    }

    fn accumulator(&self, _args: AccumulatorArgs) -> DFResult<Box<dyn Accumulator>> {
        Ok(Box::new(LlmFoldAccumulator::new(self.client.clone())))
    }

    fn state_fields(&self, _args: StateFieldsArgs) -> DFResult<Vec<Field>> {
        // Store: fold_template, map_template, collected values as JSON array
        Ok(vec![
            Field::new("fold_template", DataType::Utf8, true),
            Field::new("map_template", DataType::Utf8, true),
            Field::new("values", DataType::Utf8, true), // JSON array of strings
        ])
    }
}

#[derive(Debug)]
struct LlmFoldAccumulator {
    client: LlmClient,
    fold_template: Option<String>,
    map_template: Option<String>,
    values: Vec<String>,
}

impl LlmFoldAccumulator {
    fn new(client: LlmClient) -> Self {
        Self {
            client,
            fold_template: None,
            map_template: None,
            values: Vec::new(),
        }
    }

    /// Perform tree-reduce on values using the fold template
    fn tree_reduce(&self, mut items: Vec<String>) -> DFResult<String> {
        let fold_template = self.fold_template.as_ref().ok_or_else(|| {
            datafusion::error::DataFusionError::Execution("Missing fold template".to_string())
        })?;

        if items.is_empty() {
            return Ok(String::new());
        }

        if items.len() == 1 {
            return Ok(items.remove(0));
        }

        let client = self.client.clone();
        let template = fold_template.clone();

        // Tree reduce: pair up items and reduce until we have one
        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                while items.len() > 1 {
                    let mut prompts = Vec::new();
                    let mut new_items = Vec::new();

                    // Pair up items
                    let mut i = 0;
                    while i < items.len() {
                        if i + 1 < items.len() {
                            // Create fold prompt for this pair
                            let prompt = template
                                .replace("{0}", &items[i])
                                .replace("{1}", &items[i + 1]);
                            prompts.push(prompt);
                            i += 2;
                        } else {
                            // Odd item, carry forward
                            new_items.push(items[i].clone());
                            i += 1;
                        }
                    }

                    // Process all pairs in one batch
                    if !prompts.is_empty() {
                        eprintln!("Tree-reduce: {} pairs to process", prompts.len());
                        let results = client.process_prompts(prompts).await.map_err(|e| {
                            datafusion::error::DataFusionError::Execution(format!(
                                "LLM API error during fold: {}",
                                e
                            ))
                        })?;
                        new_items.extend(results);
                    }

                    items = new_items;
                }

                Ok(items.remove(0))
            })
        })
    }
}

impl Accumulator for LlmFoldAccumulator {
    fn update_batch(&mut self, values: &[ArrayRef]) -> DFResult<()> {
        if values.len() != 3 {
            return Err(datafusion::error::DataFusionError::Execution(
                "llm_fold requires exactly 3 arguments".to_string(),
            ));
        }

        let fold_templates = values[0]
            .as_any()
            .downcast_ref::<StringArray>()
            .ok_or_else(|| {
                datafusion::error::DataFusionError::Execution(
                    "First argument must be string".to_string(),
                )
            })?;

        let map_templates = values[1]
            .as_any()
            .downcast_ref::<StringArray>()
            .ok_or_else(|| {
                datafusion::error::DataFusionError::Execution(
                    "Second argument must be string".to_string(),
                )
            })?;

        let content = values[2]
            .as_any()
            .downcast_ref::<StringArray>()
            .ok_or_else(|| {
                datafusion::error::DataFusionError::Execution(
                    "Third argument must be string".to_string(),
                )
            })?;

        // Capture templates from first non-null row
        for i in 0..fold_templates.len() {
            if self.fold_template.is_none() && !fold_templates.is_null(i) {
                self.fold_template = Some(fold_templates.value(i).to_string());
            }
            if self.map_template.is_none() && !map_templates.is_null(i) {
                self.map_template = Some(map_templates.value(i).to_string());
            }
        }

        // Collect non-null content values
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

        let map_template = self.map_template.as_ref().ok_or_else(|| {
            datafusion::error::DataFusionError::Execution("Missing map template".to_string())
        })?;

        // Validate map template
        match validate_map_template(map_template) {
            Ok(warnings) => {
                for warning in warnings {
                    eprintln!("llm_fold() map template warning: {}", warning);
                }
            }
            Err(e) => {
                return Err(datafusion::error::DataFusionError::Execution(format!(
                    "Invalid map template: {}",
                    e
                )));
            }
        }

        let fold_template = self.fold_template.as_ref().ok_or_else(|| {
            datafusion::error::DataFusionError::Execution("Missing fold template".to_string())
        })?;

        // Validate fold template
        match validate_fold_template(fold_template) {
            Ok(warnings) => {
                for warning in warnings {
                    eprintln!("llm_fold() fold template warning: {}", warning);
                }
            }
            Err(e) => {
                return Err(datafusion::error::DataFusionError::Execution(format!(
                    "Invalid fold template: {}",
                    e
                )));
            }
        }

        // Step 1: Map all values through the map template
        let prompts: Vec<String> = self
            .values
            .iter()
            .map(|v| map_template.replace("{0}", v))
            .collect();

        eprintln!("llm_fold: mapping {} items", prompts.len());

        let mapped = tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                self.client.process_prompts(prompts).await
            })
        })
        .map_err(|e| {
            datafusion::error::DataFusionError::Execution(format!(
                "LLM API error during map: {}",
                e
            ))
        })?;

        // Step 2: Tree-reduce the mapped results
        let result = self.tree_reduce(mapped)?;

        Ok(ScalarValue::Utf8(Some(result)))
    }

    fn size(&self) -> usize {
        std::mem::size_of_val(self)
            + self.values.iter().map(|s| s.len()).sum::<usize>()
            + self.fold_template.as_ref().map(|s| s.len()).unwrap_or(0)
            + self.map_template.as_ref().map(|s| s.len()).unwrap_or(0)
    }

    fn state(&mut self) -> DFResult<Vec<ScalarValue>> {
        let values_json = serde_json::to_string(&self.values).unwrap_or_default();
        Ok(vec![
            ScalarValue::Utf8(self.fold_template.clone()),
            ScalarValue::Utf8(self.map_template.clone()),
            ScalarValue::Utf8(Some(values_json)),
        ])
    }

    fn merge_batch(&mut self, states: &[ArrayRef]) -> DFResult<()> {
        if states.len() != 3 {
            return Err(datafusion::error::DataFusionError::Execution(
                "Invalid state for llm_fold".to_string(),
            ));
        }

        let fold_templates = states[0].as_any().downcast_ref::<StringArray>().unwrap();
        let map_templates = states[1].as_any().downcast_ref::<StringArray>().unwrap();
        let values_jsons = states[2].as_any().downcast_ref::<StringArray>().unwrap();

        for i in 0..fold_templates.len() {
            if self.fold_template.is_none() && !fold_templates.is_null(i) {
                self.fold_template = Some(fold_templates.value(i).to_string());
            }
            if self.map_template.is_none() && !map_templates.is_null(i) {
                self.map_template = Some(map_templates.value(i).to_string());
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
