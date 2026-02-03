use std::collections::HashSet;
use thiserror::Error;

#[derive(Error, Debug, Clone)]
pub enum TemplateError {
    #[error("Missing placeholder {{{0}}} in template (have {1} arguments)")]
    MissingPlaceholder(usize, usize),
    #[error("Unused argument at position {0} (template only uses placeholders up to {{{1}}})")]
    UnusedArgument(usize, usize),
    #[error("Unclosed placeholder starting at position {0}")]
    UnclosedPlaceholder(usize),
    #[error("Invalid placeholder '{{}}' at position {0} (expected a number)")]
    InvalidPlaceholder(usize),
    #[error("Placeholder {{{0}}} exceeds maximum index {1}")]
    PlaceholderOutOfRange(usize, usize),
}

#[derive(Debug, Clone, Default)]
pub struct ValidationResult {
    pub errors: Vec<TemplateError>,
    pub warnings: Vec<String>,
    pub placeholders_found: HashSet<usize>,
    pub max_placeholder: Option<usize>,
}

impl ValidationResult {
    pub fn is_valid(&self) -> bool {
        self.errors.is_empty()
    }

    pub fn has_warnings(&self) -> bool {
        !self.warnings.is_empty()
    }
}

/// Parse a template and extract all placeholders {0}, {1}, etc.
pub fn parse_template(template: &str) -> ValidationResult {
    let mut result = ValidationResult::default();
    let chars: Vec<char> = template.chars().collect();
    let mut i = 0;

    while i < chars.len() {
        if chars[i] == '{' {
            // Check for escaped brace {{
            if i + 1 < chars.len() && chars[i + 1] == '{' {
                i += 2;
                continue;
            }

            let start = i;
            i += 1;

            // Find closing brace
            let mut num_str = String::new();
            while i < chars.len() && chars[i] != '}' {
                num_str.push(chars[i]);
                i += 1;
            }

            if i >= chars.len() {
                result.errors.push(TemplateError::UnclosedPlaceholder(start));
                break;
            }

            // Parse the number
            if num_str.is_empty() {
                result.errors.push(TemplateError::InvalidPlaceholder(start));
            } else if let Ok(n) = num_str.parse::<usize>() {
                result.placeholders_found.insert(n);
                result.max_placeholder = Some(
                    result.max_placeholder.map_or(n, |max| max.max(n))
                );
            } else {
                // Not a number - might be a different kind of placeholder, just warn
                result.warnings.push(format!(
                    "Non-numeric placeholder '{{{}}}' at position {}",
                    num_str, start
                ));
            }

            i += 1; // Skip closing brace
        } else if chars[i] == '}' {
            // Check for escaped brace }}
            if i + 1 < chars.len() && chars[i + 1] == '}' {
                i += 2;
                continue;
            }
            // Lone closing brace - might be intentional, just warn
            result.warnings.push(format!(
                "Unmatched '}}' at position {}",
                i
            ));
            i += 1;
        } else {
            i += 1;
        }
    }

    result
}

/// Validate a template against expected argument count
/// Returns Ok(warnings) if valid, or Err(error_message) if invalid
///
/// In non-strict mode, missing placeholders are errors if ALL placeholders are missing
/// (likely wrong argument order), but individual missing placeholders are warnings.
pub fn validate_template(
    template: &str,
    arg_count: usize,
    strict: bool,
) -> Result<Vec<String>, String> {
    let result = parse_template(template);
    let mut warnings = result.warnings.clone();

    // Check for parse errors
    if !result.errors.is_empty() {
        return Err(result.errors.iter()
            .map(|e| e.to_string())
            .collect::<Vec<_>>()
            .join("; "));
    }

    if arg_count == 0 {
        if !result.placeholders_found.is_empty() {
            return Err(format!(
                "Template has placeholders but no arguments provided"
            ));
        }
        return Ok(warnings);
    }

    // Check if template has NO placeholders at all but arguments were provided
    // This is likely a wrong argument order error - always error
    if result.placeholders_found.is_empty() {
        return Err(format!(
            "Template has no placeholders ({{0}}, {{1}}, etc.) but {} argument(s) provided. \
             Did you put the template in the wrong position? \
             Usage: llm('template with {{0}}', arg0, arg1, ...)",
            arg_count
        ));
    }

    // Check that all expected placeholders {0} through {arg_count-1} exist
    for i in 0..arg_count {
        if !result.placeholders_found.contains(&i) {
            let msg = format!(
                "Argument {} is not used in template (missing {{{}}})",
                i, i
            );
            if strict {
                return Err(msg);
            } else {
                warnings.push(msg);
            }
        }
    }

    // Check for placeholders beyond arg_count
    if let Some(max) = result.max_placeholder {
        if max >= arg_count {
            return Err(format!(
                "Template references {{{}}} but only {} argument(s) provided (indices 0-{})",
                max, arg_count, arg_count.saturating_sub(1)
            ));
        }
    }

    Ok(warnings)
}

/// Validate the fold template (expects {0} and {1})
pub fn validate_fold_template(template: &str) -> Result<Vec<String>, String> {
    let result = parse_template(template);
    let mut warnings = result.warnings.clone();

    if !result.errors.is_empty() {
        return Err(result.errors.iter()
            .map(|e| e.to_string())
            .collect::<Vec<_>>()
            .join("; "));
    }

    // Fold template must have {0} and {1}
    if !result.placeholders_found.contains(&0) {
        return Err("Fold template must contain {0} for the first item".to_string());
    }
    if !result.placeholders_found.contains(&1) {
        return Err("Fold template must contain {1} for the second item".to_string());
    }

    // Warn about extra placeholders
    if let Some(max) = result.max_placeholder {
        if max > 1 {
            warnings.push(format!(
                "Fold template has placeholder {{{}}} but only {{0}} and {{1}} are used",
                max
            ));
        }
    }

    Ok(warnings)
}

/// Validate the map template (expects {0})
pub fn validate_map_template(template: &str) -> Result<Vec<String>, String> {
    let result = parse_template(template);
    let mut warnings = result.warnings.clone();

    if !result.errors.is_empty() {
        return Err(result.errors.iter()
            .map(|e| e.to_string())
            .collect::<Vec<_>>()
            .join("; "));
    }

    // Map template must have {0}
    if !result.placeholders_found.contains(&0) {
        return Err("Map template must contain {0} for the input value".to_string());
    }

    // Warn about extra placeholders
    if let Some(max) = result.max_placeholder {
        if max > 0 {
            warnings.push(format!(
                "Map template has placeholder {{{}}} but only {{0}} is used",
                max
            ));
        }
    }

    Ok(warnings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_template() {
        assert!(validate_template("Hello {0}!", 1, true).is_ok());
        assert!(validate_template("Translate {0} to {1}", 2, true).is_ok());
        assert!(validate_template("{0} + {1} = {2}", 3, true).is_ok());
    }

    #[test]
    fn test_missing_placeholder() {
        // Strict mode: error
        assert!(validate_template("Hello {0}!", 2, true).is_err());
        // Non-strict: warning (but still valid since {0} exists)
        let result = validate_template("Hello {0}!", 2, false).unwrap();
        assert!(!result.is_empty());
    }

    #[test]
    fn test_no_placeholders_with_args() {
        // Template with no placeholders but args provided - always error
        assert!(validate_template("Hello world!", 1, false).is_err());
        assert!(validate_template("Hello world!", 2, true).is_err());
    }

    #[test]
    fn test_placeholder_out_of_range() {
        assert!(validate_template("Hello {5}!", 2, true).is_err());
    }

    #[test]
    fn test_unclosed_placeholder() {
        assert!(validate_template("Hello {0!", 1, true).is_err());
    }

    #[test]
    fn test_escaped_braces() {
        assert!(validate_template("Use {{0}} for literal braces", 0, true).is_ok());
    }

    #[test]
    fn test_no_args_no_placeholders() {
        // No args, no placeholders - valid
        assert!(validate_template("Just a static prompt", 0, true).is_ok());
    }

    #[test]
    fn test_fold_template() {
        assert!(validate_fold_template("Combine: {0} and {1}").is_ok());
        assert!(validate_fold_template("Only {0}").is_err());
        assert!(validate_fold_template("Only {1}").is_err());
    }

    #[test]
    fn test_map_template() {
        assert!(validate_map_template("Process: {0}").is_ok());
        assert!(validate_map_template("No placeholder").is_err());
    }
}
