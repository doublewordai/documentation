use arrow::array::{Array, ArrayRef, StringArray};
use arrow::datatypes::DataType;
use datafusion::common::Result as DFResult;
use datafusion::logical_expr::{ColumnarValue, ScalarFunctionArgs, ScalarUDFImpl, Signature, Volatility};
use std::any::Any;
use std::sync::Arc;

use crate::client::LlmClient;

#[derive(Debug)]
pub struct LlmExtractUdf {
    signature: Signature,
    client: LlmClient,
}

impl LlmExtractUdf {
    pub fn new(client: LlmClient) -> Self {
        Self {
            signature: Signature::exact(
                vec![DataType::Utf8, DataType::Utf8],
                Volatility::Volatile,
            ),
            client,
        }
    }
}

impl ScalarUDFImpl for LlmExtractUdf {
    fn as_any(&self) -> &dyn Any {
        self
    }

    fn name(&self) -> &str {
        "llm_extract"
    }

    fn signature(&self) -> &Signature {
        &self.signature
    }

    fn return_type(&self, _arg_types: &[DataType]) -> DFResult<DataType> {
        Ok(DataType::Utf8)
    }

    fn invoke_with_args(&self, args: ScalarFunctionArgs) -> DFResult<ColumnarValue> {
        let args = &args.args;
        if args.len() != 2 {
            return Err(datafusion::error::DataFusionError::Execution(
                "llm_extract requires exactly 2 arguments".to_string(),
            ));
        }

        // Convert both arguments to arrays
        let content_array = match &args[0] {
            ColumnarValue::Array(arr) => arr.clone(),
            ColumnarValue::Scalar(s) => s.to_array()?,
        };

        let prompt_array = match &args[1] {
            ColumnarValue::Array(arr) => arr.clone(),
            ColumnarValue::Scalar(s) => {
                // Expand scalar to match content array length
                s.to_array_of_size(content_array.len())?
            }
        };

        let content_arr = content_array
            .as_any()
            .downcast_ref::<StringArray>()
            .ok_or_else(|| {
                datafusion::error::DataFusionError::Execution(
                    "First argument must be a string".to_string(),
                )
            })?;

        let prompt_arr = prompt_array
            .as_any()
            .downcast_ref::<StringArray>()
            .ok_or_else(|| {
                datafusion::error::DataFusionError::Execution(
                    "Second argument must be a string".to_string(),
                )
            })?;

        // Collect all (content, prompt) pairs
        let mut requests = Vec::with_capacity(content_arr.len());
        let mut null_indices = Vec::new();

        for i in 0..content_arr.len() {
            if content_arr.is_null(i) || prompt_arr.is_null(i) {
                null_indices.push(i);
                requests.push((String::new(), String::new())); // Placeholder
            } else {
                requests.push((
                    content_arr.value(i).to_string(),
                    prompt_arr.value(i).to_string(),
                ));
            }
        }

        // Filter out null entries for the API call
        let valid_requests: Vec<(String, String)> = requests
            .iter()
            .enumerate()
            .filter(|(i, _)| !null_indices.contains(i))
            .map(|(_, r)| r.clone())
            .collect();

        // Call the batch API (blocking on async)
        let client = self.client.clone();
        let api_results = tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                client.process_batch(valid_requests).await
            })
        })
        .map_err(|e| {
            datafusion::error::DataFusionError::Execution(format!("LLM API error: {}", e))
        })?;

        // Reconstruct results with nulls in correct positions
        let mut result_builder = arrow::array::StringBuilder::new();
        let mut api_idx = 0;

        for i in 0..content_arr.len() {
            if null_indices.contains(&i) {
                result_builder.append_null();
            } else {
                result_builder.append_value(&api_results[api_idx]);
                api_idx += 1;
            }
        }

        let result_array: ArrayRef = Arc::new(result_builder.finish());
        Ok(ColumnarValue::Array(result_array))
    }
}
