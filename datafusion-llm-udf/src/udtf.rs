use arrow::array::{Array, ArrayRef, RecordBatch, StringArray};
use arrow::datatypes::{DataType, Field, Schema, SchemaRef};
use async_trait::async_trait;
use datafusion::catalog::Session;
use datafusion::catalog::TableFunctionImpl;
use datafusion::common::Result as DFResult;
use datafusion::datasource::TableProvider;
use datafusion::execution::context::ExecutionProps;
use datafusion::logical_expr::Expr;
use datafusion::physical_plan::memory::MemoryExec;
use datafusion::physical_plan::ExecutionPlan;
use datafusion::scalar::ScalarValue;
use std::any::Any;
use std::sync::Arc;

use crate::client::LlmClient;

/// LLM Unfold - fan-out table function
///
/// Takes a single value and produces multiple rows by splitting LLM output.
/// Can optionally iterate multiple times for recursive unfolding.
///
/// Usage:
///   SELECT * FROM llm_unfold('Extract all names:\n{0}', 'John met Mary')
///   SELECT * FROM llm_unfold('Split into parts:\n{0}', text, '\n', 2)  -- 2 iterations
///
/// Arguments:
///   - template: Prompt template with {0} for the input value
///   - value: The input value to process
///   - delimiter: How to split the output (default: newline)
///   - iterations: How many times to unfold (default: 1)
///
/// Returns a table with single column: (item TEXT)
#[derive(Debug)]
pub struct LlmUnfoldFunc {
    client: LlmClient,
}

impl LlmUnfoldFunc {
    pub fn new(client: LlmClient) -> Self {
        Self { client }
    }
}

impl TableFunctionImpl for LlmUnfoldFunc {
    fn call(&self, args: &[Expr]) -> DFResult<Arc<dyn TableProvider>> {
        if args.len() < 2 || args.len() > 4 {
            return Err(datafusion::error::DataFusionError::Plan(
                "llm_unfold requires 2-4 arguments: (template, value[, delimiter[, iterations]])".to_string(),
            ));
        }

        let template = extract_string_literal(&args[0])?;
        let value = extract_string_literal(&args[1])?;
        let delimiter = if args.len() > 2 {
            extract_string_literal(&args[2])?
        } else {
            "\n".to_string()
        };
        let iterations = if args.len() > 3 {
            extract_int_literal(&args[3])? as usize
        } else {
            1
        };

        Ok(Arc::new(LlmUnfoldTable {
            client: self.client.clone(),
            template,
            value,
            delimiter,
            iterations,
        }))
    }
}

fn extract_string_literal(expr: &Expr) -> DFResult<String> {
    match expr {
        Expr::Literal(ScalarValue::Utf8(Some(s))) => Ok(s.clone()),
        Expr::Literal(ScalarValue::LargeUtf8(Some(s))) => Ok(s.clone()),
        _ => {
            let props = ExecutionProps::new();
            let simplified = datafusion::optimizer::simplify_expressions::ExprSimplifier::new(
                datafusion::optimizer::simplify_expressions::SimplifyContext::new(&props),
            )
            .simplify(expr.clone())?;

            match simplified {
                Expr::Literal(ScalarValue::Utf8(Some(s))) => Ok(s),
                Expr::Literal(ScalarValue::LargeUtf8(Some(s))) => Ok(s),
                _ => Err(datafusion::error::DataFusionError::Plan(format!(
                    "Expected string literal, got: {:?}",
                    expr
                ))),
            }
        }
    }
}

fn extract_int_literal(expr: &Expr) -> DFResult<i64> {
    match expr {
        Expr::Literal(ScalarValue::Int8(Some(n))) => Ok(*n as i64),
        Expr::Literal(ScalarValue::Int16(Some(n))) => Ok(*n as i64),
        Expr::Literal(ScalarValue::Int32(Some(n))) => Ok(*n as i64),
        Expr::Literal(ScalarValue::Int64(Some(n))) => Ok(*n),
        Expr::Literal(ScalarValue::UInt8(Some(n))) => Ok(*n as i64),
        Expr::Literal(ScalarValue::UInt16(Some(n))) => Ok(*n as i64),
        Expr::Literal(ScalarValue::UInt32(Some(n))) => Ok(*n as i64),
        Expr::Literal(ScalarValue::UInt64(Some(n))) => Ok(*n as i64),
        _ => {
            let props = ExecutionProps::new();
            let simplified = datafusion::optimizer::simplify_expressions::ExprSimplifier::new(
                datafusion::optimizer::simplify_expressions::SimplifyContext::new(&props),
            )
            .simplify(expr.clone())?;

            match &simplified {
                Expr::Literal(ScalarValue::Int64(Some(n))) => Ok(*n),
                Expr::Literal(ScalarValue::Int32(Some(n))) => Ok(*n as i64),
                _ => Err(datafusion::error::DataFusionError::Plan(format!(
                    "Expected integer literal, got: {:?}",
                    expr
                ))),
            }
        }
    }
}

#[derive(Debug)]
struct LlmUnfoldTable {
    client: LlmClient,
    template: String,
    value: String,
    delimiter: String,
    iterations: usize,
}

#[async_trait]
impl TableProvider for LlmUnfoldTable {
    fn as_any(&self) -> &dyn Any {
        self
    }

    fn schema(&self) -> SchemaRef {
        Arc::new(Schema::new(vec![Field::new("item", DataType::Utf8, false)]))
    }

    fn table_type(&self) -> datafusion::datasource::TableType {
        datafusion::datasource::TableType::Temporary
    }

    async fn scan(
        &self,
        _state: &dyn Session,
        projection: Option<&Vec<usize>>,
        _filters: &[Expr],
        _limit: Option<usize>,
    ) -> DFResult<Arc<dyn ExecutionPlan>> {
        let mut items = vec![self.value.clone()];

        for _ in 0..self.iterations {
            let prompts: Vec<String> = items
                .iter()
                .map(|v| self.template.replace("{0}", v))
                .collect();

            let results = self
                .client
                .process_prompts(prompts)
                .await
                .map_err(|e| {
                    datafusion::error::DataFusionError::Execution(format!("LLM API error: {}", e))
                })?;

            // Split each result and flatten
            items = results
                .into_iter()
                .flat_map(|output| {
                    if self.delimiter.is_empty() {
                        vec![output]
                    } else {
                        output
                            .split(&self.delimiter)
                            .map(|s| s.trim().to_string())
                            .filter(|s| !s.is_empty())
                            .collect()
                    }
                })
                .collect();
        }

        let item_array: ArrayRef = Arc::new(StringArray::from(items));
        let batch = RecordBatch::try_new(self.schema(), vec![item_array])?;
        let exec = MemoryExec::try_new(&[vec![batch]], self.schema(), projection.cloned())?;

        Ok(Arc::new(exec))
    }
}

/// LLM Batch Map - process multiple values in a single LLM call
///
/// Takes an array of values, sends them all to the LLM in one prompt,
/// and returns the split outputs.
///
/// Usage:
///   SELECT * FROM llm_batch_map(
///     'Classify each:\n{0:2\n}\nReturn one word per line.',
///     ARRAY['apple', 'carrot', 'banana']
///   )
///
/// Arguments:
///   - template: Prompt template using range syntax {0:N<sep>}
///   - values: Array of input values
///   - delimiter: How to split output (default: newline)
///
/// Returns table with: (input TEXT, output TEXT)
#[derive(Debug)]
pub struct LlmBatchMapFunc {
    client: LlmClient,
}

impl LlmBatchMapFunc {
    pub fn new(client: LlmClient) -> Self {
        Self { client }
    }
}

impl TableFunctionImpl for LlmBatchMapFunc {
    fn call(&self, args: &[Expr]) -> DFResult<Arc<dyn TableProvider>> {
        if args.len() < 2 || args.len() > 3 {
            return Err(datafusion::error::DataFusionError::Plan(
                "llm_batch_map requires 2-3 arguments: (template, values_array[, delimiter])"
                    .to_string(),
            ));
        }

        let template = extract_string_literal(&args[0])?;
        let values = extract_string_array(&args[1])?;
        let delimiter = if args.len() > 2 {
            extract_string_literal(&args[2])?
        } else {
            "\n".to_string()
        };

        Ok(Arc::new(LlmBatchMapTable {
            client: self.client.clone(),
            template,
            values,
            delimiter,
        }))
    }
}

fn extract_string_array(expr: &Expr) -> DFResult<Vec<String>> {
    match expr {
        Expr::Literal(ScalarValue::List(arr)) => {
            let mut values = Vec::new();
            let arr = arr.as_ref();
            for i in 0..arr.len() {
                let scalar = ScalarValue::try_from_array(arr.values(), i)?;
                if let ScalarValue::Utf8(Some(s)) = scalar {
                    values.push(s);
                } else if let ScalarValue::LargeUtf8(Some(s)) = scalar {
                    values.push(s);
                }
            }
            Ok(values)
        }
        _ => Err(datafusion::error::DataFusionError::Plan(format!(
            "Expected array literal, got: {:?}",
            expr
        ))),
    }
}

#[derive(Debug)]
struct LlmBatchMapTable {
    client: LlmClient,
    template: String,
    values: Vec<String>,
    delimiter: String,
}

#[async_trait]
impl TableProvider for LlmBatchMapTable {
    fn as_any(&self) -> &dyn Any {
        self
    }

    fn schema(&self) -> SchemaRef {
        Arc::new(Schema::new(vec![
            Field::new("input", DataType::Utf8, false),
            Field::new("output", DataType::Utf8, false),
        ]))
    }

    fn table_type(&self) -> datafusion::datasource::TableType {
        datafusion::datasource::TableType::Temporary
    }

    async fn scan(
        &self,
        _state: &dyn Session,
        projection: Option<&Vec<usize>>,
        _filters: &[Expr],
        _limit: Option<usize>,
    ) -> DFResult<Arc<dyn ExecutionPlan>> {
        use crate::validation::expand_template;

        if self.values.is_empty() {
            let batch = RecordBatch::try_new(
                self.schema(),
                vec![
                    Arc::new(StringArray::from(Vec::<String>::new())),
                    Arc::new(StringArray::from(Vec::<String>::new())),
                ],
            )?;
            return Ok(Arc::new(MemoryExec::try_new(
                &[vec![batch]],
                self.schema(),
                projection.cloned(),
            )?));
        }

        // Build the prompt with all values
        let value_refs: Vec<&str> = self.values.iter().map(|s| s.as_str()).collect();
        let prompt = expand_template(&self.template, &value_refs).map_err(|e| {
            datafusion::error::DataFusionError::Execution(format!("Template error: {}", e))
        })?;

        // Call the LLM
        let result = self
            .client
            .process_prompts(vec![prompt])
            .await
            .map_err(|e| {
                datafusion::error::DataFusionError::Execution(format!("LLM API error: {}", e))
            })?;

        let output = result.into_iter().next().unwrap_or_default();

        // Split output by delimiter
        let outputs: Vec<String> = output
            .split(&self.delimiter)
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        // Pair inputs with outputs
        let len = self.values.len().max(outputs.len());
        let mut inputs = Vec::with_capacity(len);
        let mut results = Vec::with_capacity(len);

        for i in 0..len {
            inputs.push(self.values.get(i).cloned().unwrap_or_default());
            results.push(outputs.get(i).cloned().unwrap_or_default());
        }

        let batch = RecordBatch::try_new(
            self.schema(),
            vec![
                Arc::new(StringArray::from(inputs)),
                Arc::new(StringArray::from(results)),
            ],
        )?;

        Ok(Arc::new(MemoryExec::try_new(
            &[vec![batch]],
            self.schema(),
            projection.cloned(),
        )?))
    }
}
