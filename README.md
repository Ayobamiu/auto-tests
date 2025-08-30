# Auto-Tests Backend

A Node.js + Express + TypeScript backend that generates unit tests for code using OpenAI's GPT-4o API.

## Features

- 🧪 Generate unit tests for any programming language/framework
- 🤖 Powered by OpenAI GPT-4o for intelligent test generation
- 🚀 Fast and lightweight Express server
- 📝 Comprehensive error handling
- 🔒 Environment variable configuration
- 🌐 CORS enabled for frontend integration

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the environment example file and add your OpenAI API key:

```bash
cp env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your_actual_api_key_here
```

### 3. Development

```bash
# Start development server with hot reload
npm run dev

# Or build and run production
npm run build
npm start
```

The server will start on port 3000 (or the port specified in your `.env` file).

## API Endpoints

### POST /api/generate-tests

Generates unit tests for the provided code using the specified testing framework.

**Request Body:**
```json
{
  "code": "function add(a, b) { return a + b; }",
  "framework": "jest"
}
```

**Response:**
```json
{
  "tests": "describe('add function', () => {\n  test('should add two positive numbers', () => {\n    expect(add(2, 3)).toBe(5);\n  });\n});"
}
```

**Error Responses:**
- `400` - Missing or invalid parameters
- `401` - Invalid OpenAI API key
- `429` - Rate limit exceeded
- `500` - Server error or OpenAI API failure

### GET /health

Health check endpoint to verify the server is running.

## Supported Testing Frameworks

The backend can generate tests for any framework you specify. Common examples:
- Jest (JavaScript/TypeScript)
- Mocha (JavaScript)
- PyTest (Python)
- JUnit (Java)
- NUnit (.NET)

## Project Structure

```
src/
├── index.ts          # Main server file
├── routes/
│   └── generateTests.ts  # Test generation endpoint
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
└── env.example       # Environment variables template
```

## Development

- **TypeScript**: Full type safety with strict mode enabled
- **Hot Reload**: Development server automatically restarts on file changes
- **Error Handling**: Comprehensive error handling for API failures and validation
- **CORS**: Enabled for frontend integration

## Next Steps

1. Set up your OpenAI API key in the `.env` file
2. Start the development server with `npm run dev`
3. Test the endpoint with a tool like Postman or curl
4. Integrate with your frontend/extension

## Example Usage

```bash
curl -X POST http://localhost:3000/api/generate-tests \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function multiply(a, b) { return a * b; }",
    "framework": "jest"
  }'
```
