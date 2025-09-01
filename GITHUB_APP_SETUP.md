# 🚀 GitHub App Setup Guide

This guide will help you set up the "Iterate Auto Test Bot" GitHub App to automatically generate tests for your repositories.

## 📋 Prerequisites

- [ ] GitHub App "Iterate Auto Test Bot" created
- [ ] Railway deployment of this backend
- [ ] OpenAI API key

## 🔧 Step 1: Configure Your GitHub App

### 1.1 App Permissions

Go to your GitHub App settings and configure these permissions:

**Repository permissions:**

- `Contents: Read and write` - To read source files and create test files
- `Pull requests: Read` - To read PR details and changed files
- `Metadata: Read` - To read repository information

**Subscribe to events:**

- `Pull requests` - To trigger on PR events

### 1.2 Webhook Configuration

Set your webhook URL to:

```
https://your-railway-app.railway.app/api/github-webhook
```

**Webhook secret:** Generate a secure secret and save it for later.

### 1.3 App Installation

1. **Install the app** on your repositories
2. **Note the App ID** from the app settings page
3. **Generate a private key** and download the PEM file

## 🔧 Step 2: Configure Environment Variables

Add these environment variables to your Railway deployment:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Security Configuration
AUTO_TEST_WEBHOOK_SECRET=your_secure_api_key_here

# GitHub App Configuration
GITHUB_APP_ID=your_app_id_here
GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----
your_private_key_content_here
-----END RSA PRIVATE KEY-----
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Server Configuration
PORT=3000
```

### 2.1 Getting the Values

**GITHUB_APP_ID:**

- Go to your GitHub App settings
- Copy the App ID number

**GITHUB_PRIVATE_KEY:**

- In your GitHub App settings, click "Generate private key"
- Download the PEM file
- Copy the entire content (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)

**GITHUB_WEBHOOK_SECRET:**

- Use the webhook secret you set in step 1.2
- Or generate a new one: `openssl rand -hex 32`

## 🔧 Step 3: Test the Setup

### 3.1 Create a Test Repository

1. **Create a new repository** or use an existing one
2. **Install your GitHub App** on the repository
3. **Create a test file:**

```typescript
// src/utils/math.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}
```

### 3.2 Create a Pull Request

1. **Create a new branch:**

   ```bash
   git checkout -b feature/test-auto-tests
   ```

2. **Add and commit the file:**

   ```bash
   git add src/utils/math.ts
   git commit -m "Add math utility functions"
   git push origin feature/test-auto-tests
   ```

3. **Create a pull request** on GitHub

### 3.3 Watch the Magic Happen! ✨

The GitHub App will:

1. **Detect the PR** and read the changed files
2. **Call your API** to generate tests
3. **Create test files** in the PR branch
4. **Commit the tests** automatically

You should see a new file: `src/utils/__tests__/math.test.ts`

## 🔧 Step 4: Verify Everything Works

### 4.1 Check Railway Logs

1. Go to your Railway dashboard
2. Click on your deployment
3. Check the "Logs" tab for webhook activity

You should see logs like:

```
🚀 Processing PR #1: Add math utility functions
📁 Found 1 files to process: ['src/utils/math.ts']
🔍 Processing file: src/utils/math.ts
📝 Creating tests for src/utils/math.ts
✅ Generated tests for src/utils/math.ts
🎉 Processed 1/1 files successfully
```

### 4.2 Check Generated Tests

The generated test file should look like:

```typescript
import { add, multiply } from "../math";

describe("Math Functions", () => {
  describe("add function", () => {
    it("should add two positive numbers", () => {
      expect(add(2, 3)).toBe(5);
    });

    it("should add negative numbers", () => {
      expect(add(-1, -2)).toBe(-3);
    });
  });

  describe("multiply function", () => {
    it("should multiply two positive numbers", () => {
      expect(multiply(2, 3)).toBe(6);
    });

    it("should handle zero", () => {
      expect(multiply(5, 0)).toBe(0);
    });
  });
});
```

## 🔧 Step 5: Update Demo

Now test the update functionality:

### 5.1 Add a New Function

Add a new function to your file:

```typescript
// src/utils/math.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Division by zero is not allowed");
  }
  return a / b;
}
```

### 5.2 Commit and Push

```bash
git add src/utils/math.ts
git commit -m "Add divide function"
git push origin feature/test-auto-tests
```

### 5.3 Watch Smart Updates

The GitHub App will:

1. **Detect the new function**
2. **Preserve existing tests**
3. **Add tests for the new function**

## 🎯 How It Works

### Webhook Flow

1. **GitHub sends webhook** when PR is created/updated
2. **Your app verifies** the webhook signature
3. **App reads changed files** from the PR
4. **For each file:**
   - Gets file content from GitHub
   - Checks if test file exists
   - Calls your API to generate tests
   - Creates/updates test files
   - Commits changes to the PR branch

### File Processing

- **Supported files:** `.ts`, `.js`, `.tsx`, `.jsx`
- **Excluded files:** Test files, files in `__tests__` directories
- **Test location:** `__tests__/` directory next to source files
- **Naming:** `filename.test.ext`

## 🚨 Troubleshooting

### Issue: "Invalid webhook signature"

**Solution:** Check that `GITHUB_WEBHOOK_SECRET` matches your app's webhook secret

### Issue: "No installation ID found"

**Solution:** Make sure the GitHub App is installed on the repository

### Issue: "Permission denied"

**Solution:** Check that the app has the required permissions (Contents: Read and write)

### Issue: Tests not generating

**Solution:**

1. Check Railway logs for errors
2. Verify OpenAI API key is set
3. Ensure files are supported types
4. Check that files aren't test files

### Issue: Webhook not receiving events

**Solution:**

1. Verify webhook URL is correct
2. Check that "Pull requests" event is subscribed
3. Ensure the app is installed on the repository

## 🎉 Success!

Once everything is working:

- ✅ **Automatic test generation** on every PR
- ✅ **Smart test updates** when code changes
- ✅ **No manual configuration** required
- ✅ **Professional GitHub App** experience

## 📞 Support

If you encounter issues:

1. Check Railway logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with a simple file first
4. Check GitHub App permissions and installation

---

**Your GitHub App is now ready to automatically generate tests! 🚀**
