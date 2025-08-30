const core = require('@actions/core');
const { exec } = require('@actions/exec');
const github = require('@actions/github');
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

        console.log(`🚀 Starting test generation for PR #${number} in ${owner}/${repo}`);

        // Use GitHub REST API directly with the token
        const headers = {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'generate-tests-action'
        };

        // Get PR details
        const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, { headers });
        if (!prResponse.ok) {
            throw new Error(`Failed to get PR details: ${prResponse.statusText}`);
        }
        const pr = await prResponse.json();

        const baseSha = pr.base.sha;
        const headSha = pr.head.sha;

        console.log(`📊 Comparing ${baseSha}...${headSha}`);

        // Get files changed in the PR
        const filesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files`, { headers });
        if (!filesResponse.ok) {
            throw new Error(`Failed to get PR files: ${filesResponse.statusText}`);
        }
        const files = await filesResponse.json();

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
                const contentResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.filename}?ref=${headSha}`, { headers });
                if (!contentResponse.ok) {
                    console.warn(`⚠️ Could not get content for ${file.filename}: ${contentResponse.statusText}`);
                    continue;
                }

                const fileContent = await contentResponse.json();

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

                const testResponse = await fetch(`${backendUrl}/api/generate-tests`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: content,
                        framework: framework
                    })
                });

                if (!testResponse.ok) {
                    console.warn(`⚠️ Backend request failed for ${file.filename}: ${testResponse.statusText}`);
                    continue;
                }

                const testData = await testResponse.json();

                if (testData && testData.tests) {
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
                    fs.writeFileSync(testFilePath, testData.tests);

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

// Run the action
run();
