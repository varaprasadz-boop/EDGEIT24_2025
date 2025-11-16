import { Request, Response, NextFunction } from 'express';
import { IStorage } from '../storage';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  endpointKey: string;
}

let storage: IStorage;

export function initializeRateLimiter(storageInstance: IStorage) {
  storage = storageInstance;
}

function createRateLimiter(config: RateLimitConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!storage) {
      console.error('[RateLimiter] Storage not initialized');
      return next();
    }

    const userId = (req as any).user?.id;
    
    if (!userId) {
      return next();
    }

    const endpoint = config.endpointKey;
    const now = new Date();

    try {
      const existing = await storage.getRateLimit(userId, endpoint);
      const expiresAt = new Date(now.getTime() + config.windowMs);

      if (!existing || now >= existing.expiresAt) {
        await storage.createRateLimit({
          userId,
          endpoint,
          requestCount: 1,
          windowStart: now,
          expiresAt,
        });
        return next();
      }

      if (existing.requestCount >= config.maxRequests) {
        const retryAfter = Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());
        return res.status(429).json({
          message: 'Too many requests. Please try again later.',
          retryAfter,
        });
      }

      await storage.incrementRateLimit(userId, endpoint);
      next();
    } catch (error) {
      console.error('[RateLimiter] Error checking rate limit:', error);
      next();
    }
  };
}

export const RateLimits = {
  sendMessage: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 60,
    endpointKey: 'send_message',
  }),
  createConversation: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
    endpointKey: 'create_conversation',
  }),
  fileUpload: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
    endpointKey: 'file_upload',
  }),
  createMeeting: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
    endpointKey: 'create_meeting',
  }),
  search: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    endpointKey: 'search',
  }),
  general: createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 120,
    endpointKey: 'general',
  }),
};
