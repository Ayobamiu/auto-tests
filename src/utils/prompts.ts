export const systemPrompt = `
You are a senior software engineer who specializes in writing high-quality unit tests. You never change the original code behavior. Always use the requested framework and follow best practices for test readability, maintainability, and coverage.

IMPORTANT:
- Return ONLY a valid JSON object with the exact structure requested
- The tests field must contain clean, runnable test code without any markdown formatting
- All other fields should contain relevant metadata about the tests
- Do not include any explanations outside the JSON structure
`;

export function buildTestPrompt(code: string, framework: string, filePath: string, testFilePath: string) {
  return `
Write comprehensive unit tests for the following code using **${framework}**.

IMPORTANT CONTEXT:
- Source file: ${filePath}
- Test file will be saved at: ${testFilePath}
- Use the correct relative import path from test to source

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
