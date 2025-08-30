export const systemPrompt = `
You are a senior software engineer who specializes in writing high-quality unit tests. You never change the original code behavior. Always use the requested framework and follow best practices for test readability, maintainability, and coverage.

IMPORTANT: Always return the test code wrapped in proper markdown code blocks with the correct language identifier.
`;

export function buildTestPrompt(code: string, framework: string) {
  return `
Write comprehensive unit tests for the following code using **${framework}**.

Requirements:
- Do not change the original code's logic
- Cover normal, edge, and error cases
- Use descriptive test names
- Follow ${framework} best practices
- Return ONLY the test code wrapped in proper markdown code blocks

Code to test:
\`\`\`typescript
${code}
\`\`\`

Generate ${framework} tests wrapped in markdown code blocks:
\`\`\`typescript
// Your test code here
\`\`\`
`;
}
