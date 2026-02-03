use arrow::array::{Array, ArrayRef, GenericListBuilder, StringBuilder, StringArray};
use arrow::datatypes::{DataType, Field};
use datafusion::common::Result as DFResult;
use datafusion::logical_expr::{
    ColumnarValue, ScalarFunctionArgs, ScalarUDFImpl, Signature, TypeSignature, Volatility,
};
use std::any::Any;
use std::sync::Arc;

use crate::client::LlmClient;
use crate::validation::validate_template;

/// Variadic LLM UDF: llm(template, arg1, arg2, ...)
/// Template uses {0}, {1}, {2}, etc. for placeholders
/// Example: llm('Translate {0} to {1}', text_col, 'French')
#[derive(Debug)]
pub struct LlmUdf {
    signature: Signature,
    client: LlmClient,
}

impl LlmUdf {
    pub fn new(client: LlmClient) -> Self {
        Self {
            // At least 1 argument (template), then any number of string args
            signature: Signature::new(
                TypeSignature::VariadicAny,
                Volatility::Volatile,
            ),
            client,
        }
    }
}

/// LLM Split UDF: llm_split(template, arg1, arg2, ..., delimiter)
/// Like llm() but splits output by delimiter and returns an array.
/// Use with UNNEST to expand into multiple rows.
///
/// Example:
///   SELECT d.*, item FROM docs d, UNNEST(llm_split('Extract names:\n{0}', d.text, '\n')) as t(item)
#[derive(Debug)]
pub struct LlmSplitUdf {
    signature: Signature,
    client: LlmClient,
}

impl LlmSplitUdf {
    pub fn new(client: LlmClient) -> Self {
        Self {
            signature: Signature::new(
                TypeSignature::VariadicAny,
                Volatility::Volatile,
            ),
            client,
        }
    }
}

impl ScalarUDFImpl for LlmUdf {
    fn as_any(&self) -> &dyn Any {
        self
    }

    fn name(&self) -> &str {
        "llm"
    }

    fn signature(&self) -> &Signature {
        &self.signature
    }

    fn return_type(&self, _arg_types: &[DataType]) -> DFResult<DataType> {
        Ok(DataType::Utf8)
    }

    fn invoke_with_args(&self, args: ScalarFunctionArgs) -> DFResult<ColumnarValue> {
        let args = &args.args;
        if args.is_empty() {
            return Err(datafusion::error::DataFusionError::Execution(
                "llm() requires at least a template argument".to_string(),
            ));
        }

        // Get the number of rows from the first array argument
        let num_rows = args
            .iter()
            .find_map(|a| match a {
                ColumnarValue::Array(arr) => Some(arr.len()),
                _ => None,
            })
            .unwrap_or(1);

        // Convert all arguments to arrays of the same length
        let arrays: Vec<ArrayRef> = args
            .iter()
            .map(|arg| match arg {
                ColumnarValue::Array(arr) => Ok(arr.clone()),
                ColumnarValue::Scalar(s) => s.to_array_of_size(num_rows),
            })
            .collect::<DFResult<Vec<_>>>()?;

        // Convert to string arrays
        let string_arrays: Vec<&StringArray> = arrays
            .iter()
            .map(|arr| {
                arr.as_any().downcast_ref::<StringArray>().ok_or_else(|| {
                    datafusion::error::DataFusionError::Execution(
                        "All arguments to llm() must be strings".to_string(),
                    )
                })
            })
            .collect::<DFResult<Vec<_>>>()?;

        // Build prompts by filling in templates
        let mut prompts = Vec::with_capacity(num_rows);
        let mut null_indices = Vec::new();

        for row in 0..num_rows {
            // Check for nulls
            if string_arrays.iter().any(|arr| arr.is_null(row)) {
                null_indices.push(row);
                prompts.push(String::new()); // Placeholder
                continue;
            }

            // Get template (first arg)
            let template = string_arrays[0].value(row);

            // Validate template on first non-null row
            if row == 0 || (null_indices.len() == row) {
                let arg_count = string_arrays.len() - 1; // Exclude template itself
                match validate_template(template, arg_count, false) {
                    Ok(warnings) => {
                        for warning in warnings {
                            eprintln!("llm() warning: {}", warning);
                        }
                    }
                    Err(e) => {
                        return Err(datafusion::error::DataFusionError::Execution(format!(
                            "Invalid template: {}",
                            e
                        )));
                    }
                }
            }

            // Fill in placeholders {0}, {1}, {2}, etc.
            let mut prompt = template.to_string();
            for (i, arr) in string_arrays.iter().skip(1).enumerate() {
                let placeholder = format!("{{{}}}", i);
                let value = arr.value(row);
                prompt = prompt.replace(&placeholder, value);
            }

            prompts.push(prompt);
        }

        // Filter out null entries for the API call
        let valid_prompts: Vec<String> = prompts
            .iter()
            .enumerate()
            .filter(|(i, _)| !null_indices.contains(i))
            .map(|(_, p)| p.clone())
            .collect();

        // Call the batch API
        let client = self.client.clone();
        let api_results = tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                client.process_prompts(valid_prompts).await
            })
        })
        .map_err(|e| {
            datafusion::error::DataFusionError::Execution(format!("LLM API error: {}", e))
        })?;

        // Reconstruct results with nulls in correct positions
        let mut result_builder = arrow::array::StringBuilder::new();
        let mut api_idx = 0;

        for i in 0..num_rows {
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

impl ScalarUDFImpl for LlmSplitUdf {
    fn as_any(&self) -> &dyn Any {
        self
    }

    fn name(&self) -> &str {
        "llm_split"
    }

    fn signature(&self) -> &Signature {
        &self.signature
    }

    fn return_type(&self, _arg_types: &[DataType]) -> DFResult<DataType> {
        // Return List<Utf8>
        Ok(DataType::List(Arc::new(Field::new("item", DataType::Utf8, true))))
    }

    fn invoke_with_args(&self, args: ScalarFunctionArgs) -> DFResult<ColumnarValue> {
        let args = &args.args;
        if args.len() < 2 {
            return Err(datafusion::error::DataFusionError::Execution(
                "llm_split() requires at least template and delimiter arguments".to_string(),
            ));
        }

        // Last argument is the delimiter
        let num_args = args.len();

        // Get the number of rows
        let num_rows = args
            .iter()
            .find_map(|a| match a {
                ColumnarValue::Array(arr) => Some(arr.len()),
                _ => None,
            })
            .unwrap_or(1);

        // Convert all arguments to arrays
        let arrays: Vec<ArrayRef> = args
            .iter()
            .map(|arg| match arg {
                ColumnarValue::Array(arr) => Ok(arr.clone()),
                ColumnarValue::Scalar(s) => s.to_array_of_size(num_rows),
            })
            .collect::<DFResult<Vec<_>>>()?;

        // Convert to string arrays
        let string_arrays: Vec<&StringArray> = arrays
            .iter()
            .map(|arr| {
                arr.as_any().downcast_ref::<StringArray>().ok_or_else(|| {
                    datafusion::error::DataFusionError::Execution(
                        "All arguments to llm_split() must be strings".to_string(),
                    )
                })
            })
            .collect::<DFResult<Vec<_>>>()?;

        // Build prompts (excluding last arg which is delimiter)
        let mut prompts = Vec::with_capacity(num_rows);
        let mut null_indices = Vec::new();
        let mut delimiters = Vec::with_capacity(num_rows);

        for row in 0..num_rows {
            // Get delimiter for this row
            let delimiter = string_arrays[num_args - 1].value(row).to_string();
            delimiters.push(delimiter);

            // Check for nulls in template/args (not delimiter)
            if string_arrays[..num_args - 1].iter().any(|arr| arr.is_null(row)) {
                null_indices.push(row);
                prompts.push(String::new());
                continue;
            }

            let template = string_arrays[0].value(row);

            // Validate template (args excluding template and delimiter)
            if row == 0 || (null_indices.len() == row) {
                let arg_count = num_args - 2; // Exclude template and delimiter
                if let Err(e) = validate_template(template, arg_count, false) {
                    return Err(datafusion::error::DataFusionError::Execution(format!(
                        "Invalid template: {}",
                        e
                    )));
                }
            }

            // Fill in placeholders
            let mut prompt = template.to_string();
            for (i, arr) in string_arrays[1..num_args - 1].iter().enumerate() {
                let placeholder = format!("{{{}}}", i);
                let value = arr.value(row);
                prompt = prompt.replace(&placeholder, value);
            }

            prompts.push(prompt);
        }

        // Filter out null entries for API call
        let valid_prompts: Vec<String> = prompts
            .iter()
            .enumerate()
            .filter(|(i, _)| !null_indices.contains(i))
            .map(|(_, p)| p.clone())
            .collect();

        // Call the batch API
        let client = self.client.clone();
        let api_results = tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                client.process_prompts(valid_prompts).await
            })
        })
        .map_err(|e| {
            datafusion::error::DataFusionError::Execution(format!("LLM API error: {}", e))
        })?;

        // Build list array with split results
        let mut list_builder = GenericListBuilder::<i32, StringBuilder>::new(StringBuilder::new());
        let mut api_idx = 0;

        for i in 0..num_rows {
            if null_indices.contains(&i) {
                list_builder.append_null();
            } else {
                let result = &api_results[api_idx];
                let delimiter = &delimiters[i];

                // Split by delimiter and add each item
                let items: Vec<&str> = if delimiter.is_empty() {
                    vec![result.as_str()]
                } else {
                    result.split(delimiter).collect()
                };

                for item in items {
                    let trimmed = item.trim();
                    if !trimmed.is_empty() {
                        list_builder.values().append_value(trimmed);
                    }
                }
                list_builder.append(true);
                api_idx += 1;
            }
        }

        let result_array: ArrayRef = Arc::new(list_builder.finish());
        Ok(ColumnarValue::Array(result_array))
    }
}
