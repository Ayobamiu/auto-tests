const { Octokit } = require('@octokit/rest');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        // Get action inputs
        const githubToken = core.getInput('github-token', { required: true });
        const backendUrl = core.getInput('backend-url') || 'http://localhost:3000';

        // Get context
        const context = github.context;
        const { owner, repo, number } = context.issue;

        // Initialize Octokit
        const octokit = new Octokit({
            auth: githubToken
        });

        console.log(`🚀 Starting test generation for PR #${number} in ${owner}/${repo}`);

        // Get PR details
        const { data: pr } = await octokit.pulls.get({
            owner,
            repo,
            pull_number: number
        });

        const baseSha = pr.base.sha;
        const headSha = pr.head.sha;

        console.log(`📊 Comparing ${baseSha}...${headSha}`);

        // Get files changed in the PR
        const { data: files } = await octokit.pulls.listFiles({
            owner,
            repo,
            pull_number: number
        });

        // Filter for TypeScript/JavaScript files
        const tsJsFiles = files.filter(file =>
            file.filename.endsWith('.ts') ||
            file.filename.endsWith('.js') ||
            file.filename.endsWith('.tsx') ||
            file.filename.endsWith('.jsx')
        );

        console.log(`🔍 Found ${tsJsFiles.length} TypeScript/JavaScript files to process`);

        // Process each file
        for (const file of tsJsFiles) {
            try {
                console.log(`📝 Processing ${file.filename}...`);

                // Get file content
                const { data: fileContent } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path: file.filename,
                    ref: headSha
                });

                // Decode content (GitHub returns base64 encoded content)
                const content = Buffer.from(fileContent.content, 'base64').toString('utf-8');

                // Determine framework based on file extension
                let framework = 'jest'; // default
                if (file.filename.endsWith('.ts') || file.filename.endsWith('.tsx')) {
                    framework = 'jest';
                } else if (file.filename.endsWith('.js') || file.filename.endsWith('.jsx')) {
                    framework = 'jest';
                }

                // Send to backend for test generation
                console.log(`🤖 Generating ${framework} tests for ${file.filename}...`);

                const response = await axios.post(`${backendUrl}/api/generate-tests`, {
                    code: content,
                    framework: framework
                }, {
                    timeout: 30000, // 30 second timeout
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (response.data && response.data.tests) {
                    // Create test file path
                    const dirName = path.dirname(file.filename);
                    const baseName = path.basename(file.filename, path.extname(file.filename));
                    const testDir = path.join(dirName, '__tests__');
                    const testFilePath = path.join(testDir, `${baseName}.test.ts`);

                    // Ensure test directory exists
                    if (!fs.existsSync(testDir)) {
                        fs.mkdirSync(testDir, { recursive: true });
                    }

                    // Write test file
                    fs.writeFileSync(testFilePath, response.data.tests);

                    console.log(`✅ Generated tests saved to ${testFilePath}`);

                    // Add and commit the test file
                    await exec.exec('git', ['add', testFilePath]);
                    await exec.exec('git', ['commit', '-m', `Add auto-generated tests for ${file.filename}`]);
                    await exec.exec('git', ['push']);

                    console.log(`🚀 Committed and pushed test file for ${file.filename}`);

                } else {
                    console.warn(`⚠️ No tests generated for ${file.filename}`);
                }

            } catch (fileError) {
                console.error(`❌ Error processing ${file.filename}:`, fileError.message);
                // Continue with next file
            }
        }

        console.log(`🎉 Test generation completed for PR #${number}`);

    } catch (error) {
        console.error('❌ Action failed:', error.message);
        core.setFailed(error.message);
    }
}

// Import core and exec from @actions/core and @actions/exec
const core = require('@actions/core');
const { exec } = require('@actions/exec');
const github = require('@actions/github');

// Run the action
run();
