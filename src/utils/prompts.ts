export const systemPrompt = `
You are a senior software engineer who specializes in writing high-quality unit tests. You never change the original code behavior. Always use the requested framework and follow best practices for test readability, maintainability, and coverage.
`;

export function buildTestPrompt(code: string, framework: string) {
    return `
  Write unit tests for the following function using **${framework}**.
  - Do not change the original function's logic.
  - Cover normal, edge, and error cases.
  - Use descriptive test names.
  - Return only the test code inside a single \`\`\` block. Do not add any explanation.
  
  Code:
  \`\`\`js
  ${code}
  \`\`\`
  `;
}
