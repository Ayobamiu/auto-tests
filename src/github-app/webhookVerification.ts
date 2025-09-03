import { createHmac } from 'crypto';

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
    const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

    if (!GITHUB_WEBHOOK_SECRET) {
        console.warn('No webhook secret configured, skipping signature verification');
        return true;
    }

    if (!signature) {
        console.error('No signature provided in webhook request');
        return false;
    }

    const expectedSignature = `sha256=${createHmac('sha256', GITHUB_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex')}`;

    return signature === expectedSignature;
}
