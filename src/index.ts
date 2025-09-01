import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateTestsRouter } from './routes/generateTests';
import { githubWebhookRouter } from './routes/githubWebhook';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Regular JSON parsing
app.use(express.json());

// CORS middleware
app.use(cors());

// Routes
app.use('/api', generateTestsRouter);
app.use('/api', githubWebhookRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
    console.log(`🚀 Auto-tests backend server running on port ${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 Generate tests: http://localhost:${PORT}/api/generate-tests`);
    console.log(`🔐 Security: API key required for /api/generate-tests`);
});
