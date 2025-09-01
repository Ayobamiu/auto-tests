import { Router } from 'express';
import { handleWebhook } from '../github-app/webhookHandler';

const router = Router();

// GitHub App webhook endpoint
router.post('/github-webhook', handleWebhook);

export { router as githubWebhookRouter };
