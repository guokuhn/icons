/**
 * Integration tests for CORS configuration in Express application
 * Tests the complete integration of CorsConfigManager with the Express app
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cors from 'cors';
import { CorsConfigManager } from './corsConfig.js';

describe('CORS Configuration Integration', () => {
  let app: Express;
  let corsConfigManager: CorsConfigManager;

  describe('With multiple origins configured', () => {
    beforeAll(() => {
      // Create a test Express app with CORS configured
      app = express();
      corsConfigManager = new CorsConfigManager();
      
      // Simulate CORS_ORIGIN environment variable with multiple origins
      const corsConfig = corsConfigManager.parseConfig('http://localhost:5173,http://localhost:8000');
      const corsMiddleware = cors(corsConfigManager.getCorsMiddlewareConfig(corsConfig));
      
      app.use(corsMiddleware);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should allow requests from first configured origin', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.body).toEqual({ message: 'success' });
    });

    it('should allow requests from second configured origin', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:8000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8000');
      expect(response.body).toEqual({ message: 'success' });
    });

    it('should reject requests from non-configured origin', async () => {
      await request(app)
        .get('/test')
        .set('Origin', 'http://evil.com')
        .expect(500); // CORS error results in 500
    });

    it('should allow same-origin requests (no Origin header)', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'success' });
    });
  });

  describe('With wildcard configuration', () => {
    beforeAll(() => {
      app = express();
      corsConfigManager = new CorsConfigManager();
      
      // Simulate CORS_ORIGIN=*
      const corsConfig = corsConfigManager.parseConfig('*');
      const corsMiddleware = cors(corsConfigManager.getCorsMiddlewareConfig(corsConfig));
      
      app.use(corsMiddleware);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should allow requests from any origin', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://any-domain.com')
        .expect(200);

      expect(response.body).toEqual({ message: 'success' });
    });
  });

  describe('With empty configuration', () => {
    beforeAll(() => {
      app = express();
      corsConfigManager = new CorsConfigManager();
      
      // Simulate CORS_ORIGIN not set or empty
      const corsConfig = corsConfigManager.parseConfig('');
      const corsMiddleware = cors(corsConfigManager.getCorsMiddlewareConfig(corsConfig));
      
      app.use(corsMiddleware);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should reject all cross-origin requests', async () => {
      await request(app)
        .get('/test')
        .set('Origin', 'http://localhost:5173')
        .expect(500); // CORS error results in 500
    });

    it('should allow same-origin requests (no Origin header)', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'success' });
    });
  });
});
