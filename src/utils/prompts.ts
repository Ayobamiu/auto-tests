import { ChangeType } from "../types/types";

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

function getContextSection(changeType: ChangeType = 'new', filePath: string, testFilePath: string, previousCode?: string, existingTests?: string): string {
  let contextSection = '';

  if (changeType === 'update' && existingTests) {
    contextSection = `
    EXISTING TESTS CONTEXT:
    - Current test file exists at: ${testFilePath}
    - Existing test content:
    \`\`\`typescript
    ${existingTests}
    \`\`\`
    - Your job is to preserve these existing tests, and ONLY generate new ones for newly added or changed functions


    UPDATE STRATEGY:
    - Keep existing tests unchanged unless they're invalid or outdated (very rare)
    - ONLY add tests for newly added or modified functions
    - Maintain consistency in import statements, naming, structure
    - Return test code as-is without any extra formatting or comments
    - Preserve valuable existing tests
    - Update tests for changed behavior
    - Remove tests for removed functionality
    - Explain what you're changing and why
    `;
  } else if (changeType === 'regenerate') {
    contextSection = `
    REGENERATION CONTEXT:
    - You are completely regenerating tests for: ${filePath}
    - Previous code (if available):
    \`\`\`typescript
    ${previousCode || 'Not available'}
    \`\`\`
    - Existing tests (for reference):
    \`\`\`typescript
    ${existingTests || 'Not available'}
    \`\`\`

    REGENERATION STRATEGY:
    - Analyze existing tests for quality
    - Keep high-quality tests if they still apply
    - Regenerate poor or outdated tests
    - Provide reasoning for your decisions
    `;
  }

  return contextSection;
}

export function buildTestPrompt(
  code: string,
  framework: string,
  filePath: string,
  testFilePath: string,
  changeType: ChangeType = 'new',
  previousCode?: string,
  existingTests?: string
) {

  const contextSection = getContextSection(changeType, filePath, testFilePath, previousCode, existingTests);

  return `
Write comprehensive unit tests for the following code using **${framework}**.

IMPORTANT CONTEXT:
- Source file: ${filePath}
- Test file will be saved at: ${testFilePath}
- Change type: ${changeType}
- Use the correct relative import path from test to source

${contextSection}

Requirements:
- Do not change the original code's logic
- Cover normal, edge, and error cases
- Use descriptive test names
- Generate the correct import statement using relative path
- Use Jest standard syntax with 'it()' statements (not 'test()')
- Follow ${framework} best practices
- Return JSON with the exact structure requested

Code to test:
\`\`\`typescript
${code}
\`\`\`

Generate ${framework} tests with correct imports and ${framework} syntax:
`;
}
