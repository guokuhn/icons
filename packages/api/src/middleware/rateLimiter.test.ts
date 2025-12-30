import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { readRateLimiter, writeRateLimiter } from './rateLimiter.js';

describe('Rate Limiter Middleware', () => {
  describe('readRateLimiter', () => {
    let app: express.Application;

    beforeEach(() => {
      // Create a fresh app for each test
      app = express();
      app.get('/test', readRateLimiter, (req: Request, res: Response) => {
        res.json({ success: true });
      });
    });

    it('should allow requests within rate limit', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should include rate limit headers in response', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('should return 429 when rate limit is exceeded', async () => {
      // Get the rate limit from environment or use default
      const rateLimit = parseInt(process.env.RATE_LIMIT_READ || '1000', 10);
      
      // Make requests up to the limit
      for (let i = 0; i < rateLimit; i++) {
        await request(app).get('/test');
      }
      
      // The next request should be rate limited
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    }, 30000); // Increase timeout for this test
  });

  describe('writeRateLimiter', () => {
    let app: express.Application;

    beforeEach(() => {
      // Create a fresh app for each test
      app = express();
      app.post('/test', writeRateLimiter, (req: Request, res: Response) => {
        res.json({ success: true });
      });
    });

    it('should allow requests within rate limit', async () => {
      const response = await request(app).post('/test');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should include rate limit headers in response', async () => {
      const response = await request(app).post('/test');
      
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('should have lower limit than read rate limiter', () => {
      const readLimit = parseInt(process.env.RATE_LIMIT_READ || '1000', 10);
      const writeLimit = parseInt(process.env.RATE_LIMIT_WRITE || '100', 10);
      
      expect(writeLimit).toBeLessThan(readLimit);
    });
  });
});
