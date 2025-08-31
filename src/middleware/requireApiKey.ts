import { Request, Response, NextFunction } from 'express';

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;
    const expectedApiKey = process.env.AUTO_TEST_WEBHOOK_SECRET;

    if (!expectedApiKey) {
        console.error('AUTO_TEST_WEBHOOK_SECRET environment variable is not set');
        return res.status(500).json({ error: 'API key secret not configured' });
    }

    if (!apiKey) {
        console.warn('Missing x-api-key header');
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'API key is required'
        });
    }

    if (apiKey !== expectedApiKey) {
        console.warn('Invalid API key provided');
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid API key'
        });
    }

    console.log('✅ API key verified successfully');
    next();
}
