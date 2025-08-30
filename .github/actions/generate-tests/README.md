# Generate Tests GitHub Action

This custom GitHub Action automatically generates unit tests for changed TypeScript/JavaScript files in pull requests using your auto-tests backend service.

## Features

- 🔍 **Automatic Detection**: Scans PR changes for `.ts`, `.js`, `.tsx`, and `.jsx` files
- 🤖 **AI-Powered**: Uses your OpenAI-powered backend to generate comprehensive tests
- 📁 **Smart Organization**: Creates tests in `__tests__/` directories alongside source files
- 🚀 **Auto-Commit**: Automatically commits and pushes generated test files
- 💬 **PR Notifications**: Comments on PRs to inform about generated tests

## How It Works

1. **Trigger**: Runs on pull request events (opened, synchronized, reopened)
2. **File Detection**: Uses Octokit to get the list of changed files
3. **Content Retrieval**: Fetches the actual content of changed TypeScript/JavaScript files
4. **Test Generation**: Sends each file to your backend service for AI-powered test generation
5. **File Creation**: Saves generated tests in `__tests__/<filename>.test.ts` format
6. **Auto-Commit**: Commits and pushes the new test files back to the PR branch
7. **Notification**: Comments on the PR to inform about the generated tests

## Setup

### 1. Repository Secrets

Add these secrets to your repository:

- `GITHUB_TOKEN`: Automatically provided by GitHub
- `BACKEND_URL`: (Optional) URL of your auto-tests backend service (defaults to `http://localhost:3000`)

### 2. Backend Service

Ensure your auto-tests backend is running and accessible from GitHub Actions. For local development, you might need to:
- Use a service like ngrok to expose your local backend
- Deploy the backend to a cloud service
- Use GitHub Codespaces or similar for development

### 3. Action Permissions

The action requires these permissions to work properly:
- `contents: write` - To commit and push test files
- `pull-requests: read` - To access PR information
- `issues: write` - To comment on PRs

## Usage

The action runs automatically on pull requests. No manual intervention required!

### Manual Trigger

You can also trigger the action manually by adding this to your workflow:

```yaml
- name: Generate Tests Manually
  uses: ./.github/actions/generate-tests
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    backend-url: ${{ secrets.BACKEND_URL }}
```

## Output Structure

For a file `src/utils/calculator.ts`, the action will create:
```
src/
├── utils/
│   ├── calculator.ts
│   └── __tests__/
│       └── calculator.test.ts
```

## Customization

### Supported File Types
- `.ts` - TypeScript files
- `.js` - JavaScript files  
- `.tsx` - TypeScript React files
- `.jsx` - JavaScript React files

### Testing Framework
Currently hardcoded to use Jest. To support other frameworks:
1. Modify the framework detection logic in `index.js`
2. Update the backend to handle different framework requests
3. Adjust the test file naming convention

### Backend Integration
The action expects your backend to:
- Accept POST requests to `/api/generate-tests`
- Expect JSON body: `{ code: string, framework: string }`
- Return JSON response: `{ tests: string }`

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the action has `contents: write` permission
2. **Backend Unreachable**: Check if your backend URL is accessible from GitHub Actions
3. **Git Operations Fail**: Verify the checkout action has `fetch-depth: 0` for full history
4. **Rate Limiting**: The action includes timeouts and error handling for API failures

### Debugging

Check the action logs for detailed information about:
- Files being processed
- Backend API calls
- Git operations
- Any errors encountered

## Development

### Building the Action

```bash
cd .github/actions/generate-tests
npm install
npm run build
```

### Local Testing

Test the action locally by:
1. Running your backend service
2. Creating a test PR with TypeScript/JavaScript changes
3. Manually triggering the workflow

## Security Notes

- The action runs with the permissions of the `GITHUB_TOKEN`
- Generated test files are committed to the PR branch (not the main branch)
- Backend API calls include timeouts to prevent hanging
- Error handling ensures the action fails gracefully on issues
