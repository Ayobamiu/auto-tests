
export function systemPrompt(framework: string) {
  return `
You are a senior software engineer who specializes in writing high-quality unit tests. You NEVER change the original code’s behavior or structure. You ONLY write tests for code that is NEW or MODIFIED based on context.

## Output Format
- Respond with a single, valid JSON object
- Do NOT wrap code in markdown (\`\`\`) or add any explanations
- Only return keys required by the output schema
- The 'tests' field must include **runnable** ${framework} test code, using correct import statements

## Critical Constraints
- DO NOT rewrite or duplicate existing tests unless specifically instructed
- DO NOT generate tests for unchanged functions
- DO NOT change import style (e.g., if current tests use ESModule imports, do not switch to require())
- Use the correct relative import path from test to source file
- Use 'describe' + 'it' from ${framework} (e.g., Jest), not 'test'
- Do not include any extra output outside the JSON structure
`;
}


/**
 * Build prompt for complete test file generation (single-pass approach)
 * This prompt gives the AI all context and asks it to return the complete, correct test file
 */
export function buildCompleteTestFilePrompt(
  currentCode: string,
  previousCode: string | null,
  existingTests: string | null,
  filePath: string,
  testFilePath: string,
  diff: string,
  framework: string = 'jest'
): string {
  return `
You are a test file manager. Your job is to analyze the current state and return the complete, correct test file.

## CONTEXT:
- **Source file**: ${filePath}
- **Test file**: ${testFilePath}
- **Framework**: ${framework}

## CURRENT CODE (what exists now):
\`\`\`typescript
${currentCode}
\`\`\`

## PREVIOUS CODE (what existed before):
\`\`\`typescript
${previousCode || 'Not available'}
\`\`\`

## EXISTING TESTS (current test file):
\`\`\`typescript
${existingTests || 'No existing tests'}
\`\`\`

## CHANGES (Git diff):
\`\`\`
${diff}
\`\`\`

## YOUR TASK:
Return the complete, correct test file that:

1. **Only tests functions that exist in CURRENT CODE**
2. **Removes tests for functions that were removed** (not in current code)
3. **Adds tests for functions that were added** (new in current code)
4. **Preserves tests for unchanged functions** (exist in both current and previous code)
5. **Updates imports to match current functions only**
6. **Uses correct relative import path from test to source file**
7. **Follows ${framework} best practices**

## IMPORTANT:
- Return the COMPLETE test file, not just new tests
- Include proper imports for all current functions
- Remove any tests for functions that no longer exist
- Use 'describe' and 'it' syntax for ${framework}
- Make sure all tests are runnable and valid

Generate the complete ${framework} test file:
`;
}
