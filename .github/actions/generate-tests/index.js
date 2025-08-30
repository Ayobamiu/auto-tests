const fs = require('fs');
const path = require('path');

async function run() {
    try {
        // Get action inputs from environment variables
        const githubToken = process.env.GITHUB_TOKEN;
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';

        if (!githubToken) {
            throw new Error('GITHUB_TOKEN environment variable is required');
        }

        // Get context from environment variables
        const owner = process.env.GITHUB_REPOSITORY_OWNER;
        const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
        const prNumber = process.env.GITHUB_EVENT_PATH ?
            JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).pull_request.number :
            process.env.GITHUB_REF_NAME?.replace('refs/pull/', '').replace('/merge', '');

        if (!owner || !repo || !prNumber) {
            throw new Error('Could not determine repository or PR information');
        }

        console.log(`🚀 Starting test generation for PR #${prNumber} in ${owner}/${repo}`);

        // Use GitHub REST API directly with the token
        const headers = {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'generate-tests-action'
        };

        // Get PR details
        const prResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, { headers });
        if (!prResponse.ok) {
            throw new Error(`Failed to get PR details: ${prResponse.statusText}`);
        }
        const pr = await prResponse.json();

        const baseSha = pr.base.sha;
        const headSha = pr.head.sha;

        console.log(`📊 Comparing ${baseSha}...${headSha}`);

        // Get files changed in the PR
        const filesResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, { headers });
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

                    // Use git commands directly with better error handling
                    const { execSync } = require('child_process');

                    try {
                        // Add the test file
                        execSync(`git add "${testFilePath}"`, { stdio: 'inherit' });
                        console.log(`✅ Added ${testFilePath} to git`);

                        // Commit the test file
                        execSync(`git commit -m "Add auto-generated tests for ${file.filename}"`, { stdio: 'inherit' });
                        console.log(`✅ Committed ${testFilePath}`);

                        // Push the changes
                        execSync('git push', { stdio: 'inherit' });
                        console.log(`🚀 Pushed test file for ${file.filename}`);

                    } catch (gitError) {
                        console.error(`❌ Git operation failed for ${file.filename}:`, gitError.message);
                        // Continue with next file instead of failing the entire action
                        continue;
                    }

                } else {
                    console.warn(`⚠️ No tests generated for ${file.filename}`);
                }

            } catch (fileError) {
                console.error(`❌ Error processing ${file.filename}:`, fileError.message);
                // Continue with next file
            }
        }

        console.log(`🎉 Test generation completed for PR #${prNumber}`);

    } catch (error) {
        console.error('❌ Action failed:', error.message);
        process.exit(1);
    }
}

// Run the action
run();
