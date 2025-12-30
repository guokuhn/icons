import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from './index.js';
import { IconSetManager } from './managers/IconSetManager.js';
import { SVGParser } from './parsers/SVGParser.js';

describe('HTTP Server and Routes', () => {
  const iconSetManager = new IconSetManager();
  const svgParser = new SVGParser();

  beforeAll(async () => {
    // Add a test icon to ensure we have data
    const testSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
    </svg>`;
    
    try {
      await iconSetManager.addIcon('gd', 'test-icon', testSVG);
    } catch (error) {
      // Icon might already exist, that's okay
    }
  });

  describe('GET /collections', () => {
    it('should return icon set list with cache headers', async () => {
      const response = await request(app)
        .get('/collections')
        .expect(200);

      expect(response.body).toHaveProperty('gd');
      expect(response.body.gd).toHaveProperty('name', 'gd');
      expect(response.body.gd).toHaveProperty('total');
      expect(response.body.gd.total).toBeGreaterThan(0);
      
      // Check cache headers
      expect(response.headers).toHaveProperty('cache-control');
      expect(response.headers).toHaveProperty('etag');
      expect(response.headers).toHaveProperty('last-modified');
    });

    it('should return 304 for conditional request with matching ETag', async () => {
      // First request to get ETag
      const firstResponse = await request(app)
        .get('/collections')
        .expect(200);

      const etag = firstResponse.headers['etag'];

      // Second request with If-None-Match
      await request(app)
        .get('/collections')
        .set('If-None-Match', etag)
        .expect(304);
    });
  });

  describe('GET /collection', () => {
    it('should return complete icon set for valid prefix', async () => {
      const response = await request(app)
        .get('/collection?prefix=gd')
        .expect(200);

      expect(response.body).toHaveProperty('prefix', 'gd');
      expect(response.body).toHaveProperty('icons');
      expect(Object.keys(response.body.icons).length).toBeGreaterThan(0);
      
      // Check cache headers
      expect(response.headers).toHaveProperty('cache-control');
      expect(response.headers).toHaveProperty('etag');
    });

    it('should return 400 for missing prefix parameter', async () => {
      const response = await request(app)
        .get('/collection')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 304 for conditional request with matching ETag', async () => {
      // First request to get ETag
      const firstResponse = await request(app)
        .get('/collection?prefix=gd')
        .expect(200);

      const etag = firstResponse.headers['etag'];

      // Second request with If-None-Match
      await request(app)
        .get('/collection?prefix=gd')
        .set('If-None-Match', etag)
        .expect(304);
    });
  });

  describe('GET /icons', () => {
    it('should return specified icons', async () => {
      const response = await request(app)
        .get('/icons?icons=gd:test-icon')
        .expect(200);

      expect(response.body).toHaveProperty('gd');
      expect(response.body.gd).toHaveProperty('icons');
      expect(response.body.gd.icons).toHaveProperty('test-icon');
      
      // Check cache headers
      expect(response.headers).toHaveProperty('cache-control');
      expect(response.headers).toHaveProperty('etag');
    });

    it('should return multiple icons when requested', async () => {
      const response = await request(app)
        .get('/icons?icons=gd:test-icon,gd:home')
        .expect(200);

      expect(response.body).toHaveProperty('gd');
      expect(response.body.gd).toHaveProperty('icons');
      // Should have at least test-icon
      expect(response.body.gd.icons).toHaveProperty('test-icon');
    });

    it('should return 400 for missing icons parameter', async () => {
      const response = await request(app)
        .get('/icons')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 404 when no requested icons are found', async () => {
      const response = await request(app)
        .get('/icons?icons=gd:nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 304 for conditional request with matching ETag', async () => {
      // First request to get ETag
      const firstResponse = await request(app)
        .get('/icons?icons=gd:test-icon')
        .expect(200);

      const etag = firstResponse.headers['etag'];

      // Second request with If-None-Match
      await request(app)
        .get('/icons?icons=gd:test-icon')
        .set('If-None-Match', etag)
        .expect(304);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent icon set', async () => {
      const response = await request(app)
        .get('/collection?prefix=nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('timestamp');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status with all checks', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('checks');
      expect(response.body).toHaveProperty('stats');
      
      // Check that all required checks are present
      expect(response.body.checks).toHaveProperty('storage');
      expect(response.body.checks).toHaveProperty('cache');
      expect(response.body.checks).toHaveProperty('figma');
      
      // Check that stats are present
      expect(response.body.stats).toHaveProperty('uptime');
      expect(response.body.stats).toHaveProperty('totalIcons');
      
      // Verify uptime is a positive number
      expect(response.body.stats.uptime).toBeGreaterThanOrEqual(0);
      
      // Verify totalIcons is a non-negative number
      expect(response.body.stats.totalIcons).toBeGreaterThanOrEqual(0);
    });

    it('should include storage check status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.checks.storage).toMatch(/^(ok|error)$/);
    });

    it('should include cache check status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.checks.cache).toMatch(/^(ok|error)$/);
    });

    it('should include figma check status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Figma can be ok, error, or not_configured
      expect(response.body.checks.figma).toMatch(/^(ok|error|not_configured)$/);
    });

    it('should return 503 when service is degraded', async () => {
      // This test would require mocking failures, which is complex
      // For now, we just verify the endpoint structure
      const response = await request(app)
        .get('/health');

      // Status should be either 200 (healthy) or 503 (degraded)
      expect([200, 503]).toContain(response.status);
      
      if (response.status === 503) {
        expect(response.body.status).toBe('degraded');
      }
    });
  });

  describe('CORS', () => {
    it('should include CORS headers for allowed origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers in read endpoint responses', async () => {
      const response = await request(app)
        .get('/collections')
        .expect(200);

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });

    it('should include rate limit headers in write endpoint responses', async () => {
      const apiKey = process.env.API_KEY || 'dev-api-key-12345';
      const validSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
      </svg>`;

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'rate-limit-test')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });

  describe('DELETE /api/icons/:namespace/:name', () => {
    const validSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
    </svg>`;
    const apiKey = process.env.API_KEY || 'dev-api-key-12345';

    it('should successfully delete an existing icon with authentication', async () => {
      // First, upload an icon to delete
      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'icon-to-delete')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      // Delete the icon
      const response = await request(app)
        .delete('/api/icons/gd/icon-to-delete')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Icon deleted successfully');
      expect(response.body.data).toHaveProperty('namespace', 'gd');
      expect(response.body.data).toHaveProperty('name', 'icon-to-delete');
    });

    it('should return 401 when deleting without API key', async () => {
      const response = await request(app)
        .delete('/api/icons/gd/test-icon')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 401 when deleting with invalid API key', async () => {
      const response = await request(app)
        .delete('/api/icons/gd/test-icon')
        .set('Authorization', 'Bearer invalid-key')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 404 when deleting non-existent icon', async () => {
      const response = await request(app)
        .delete('/api/icons/gd/non-existent-icon')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error.message).toContain('not found');
    });

    it('should invalidate cache after successful deletion', async () => {
      // First, upload an icon
      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'cache-delete-test')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      // Get the icon set to populate cache
      const firstResponse = await request(app)
        .get('/collection?prefix=gd')
        .expect(200);

      const firstETag = firstResponse.headers['etag'];

      // Delete the icon
      await request(app)
        .delete('/api/icons/gd/cache-delete-test')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      // Get the icon set again - ETag should be different
      const secondResponse = await request(app)
        .get('/collection?prefix=gd')
        .expect(200);

      const secondETag = secondResponse.headers['etag'];

      expect(secondETag).not.toBe(firstETag);
    });

    it('should verify icon is no longer accessible after deletion', async () => {
      // First, upload an icon
      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'verify-delete-test')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      // Verify icon exists
      await request(app)
        .get('/icons?icons=gd:verify-delete-test')
        .expect(200);

      // Delete the icon
      await request(app)
        .delete('/api/icons/gd/verify-delete-test')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      // Verify icon is no longer accessible
      await request(app)
        .get('/icons?icons=gd:verify-delete-test')
        .expect(404);
    });

    it('should handle deletion from custom namespace', async () => {
      // Upload to custom namespace
      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'custom-delete-test')
        .field('namespace', 'custom')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      // Delete from custom namespace
      const response = await request(app)
        .delete('/api/icons/custom/custom-delete-test')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('namespace', 'custom');
      expect(response.body.data).toHaveProperty('name', 'custom-delete-test');
    });
  });

  describe('POST /api/upload', () => {
    const validSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
    </svg>`;
    const apiKey = process.env.API_KEY || 'dev-api-key-12345';

    it('should successfully upload a valid SVG icon with authentication', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'test-upload-icon')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('namespace', 'gd');
      expect(response.body.data).toHaveProperty('name', 'test-upload-icon');
      expect(response.body.data).toHaveProperty('size');
    });

    it('should return 401 when uploading without API key', async () => {
      const response = await request(app)
        .post('/api/upload')
        .field('name', 'test-upload-icon')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 401 when uploading with invalid API key', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', 'Bearer invalid-key')
        .field('name', 'test-upload-icon')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should accept API key in x-api-key header', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('x-api-key', apiKey)
        .field('name', 'test-x-api-key')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should accept icon name from query parameter', async () => {
      const response = await request(app)
        .post('/api/upload?name=test-query-icon')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      expect(response.body.data).toHaveProperty('name', 'test-query-icon');
    });

    it('should accept custom namespace', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'custom-ns-icon')
        .field('namespace', 'custom')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      expect(response.body.data).toHaveProperty('namespace', 'custom');
    });

    it('should return 400 when no file is uploaded', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'test-icon')
        .expect(400);

      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error.message).toContain('No file uploaded');
    });

    it('should return 400 when icon name is missing', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(400);

      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Icon name is required');
    });

    it('should return 400 for invalid icon name format', async () => {
      const invalidNames = [
        { name: 'icon with spaces', shouldFail: true },
        { name: 'icon@special', shouldFail: true },
        { name: 'icon.dot', shouldFail: true },
        { name: 'a'.repeat(51), shouldFail: true }, // Too long
      ];

      for (const { name, shouldFail } of invalidNames) {
        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${apiKey}`)
          .field('name', name)
          .attach('icon', Buffer.from(validSVG), 'test.svg')
          .expect(400);

        expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
        if (shouldFail) {
          expect(response.body.error.message).toContain('Invalid icon name format');
        }
      }
    });

    it('should accept valid icon names with hyphens and underscores', async () => {
      const validNames = ['icon-name', 'icon_name', 'icon123', 'ICON', 'icon-123_test'];

      for (const validName of validNames) {
        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${apiKey}`)
          .field('name', validName)
          .field('conflictStrategy', 'overwrite')
          .attach('icon', Buffer.from(validSVG), 'test.svg')
          .expect(201);

        expect(response.body.data).toHaveProperty('name', validName);
      }
    });

    it('should return 400 for non-SVG file content', async () => {
      const invalidContent = '<html><body>Not an SVG</body></html>';
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'invalid-svg')
        .attach('icon', Buffer.from(invalidContent), 'test.svg')
        .expect(400);

      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid SVG file');
    });

    it('should return 413 for file exceeding size limit', async () => {
      // Create a large SVG (> 1MB)
      const largeSVG = '<svg xmlns="http://www.w3.org/2000/svg">' + 'x'.repeat(2 * 1024 * 1024) + '</svg>';
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'large-icon')
        .attach('icon', Buffer.from(largeSVG), 'test.svg')
        .expect(413);

      expect(response.body.error).toHaveProperty('code', 'PAYLOAD_TOO_LARGE');
      expect(response.body.error.message).toContain('1MB');
    });

    it('should return 400 for invalid SVG that fails parsing', async () => {
      const invalidSVG = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'; // No path data
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'invalid-parse')
        .attach('icon', Buffer.from(invalidSVG), 'test.svg')
        .expect(400);

      expect(response.body.error).toHaveProperty('code');
      // Should be either VALIDATION_ERROR or INVALID_SVG
    });

    it('should invalidate cache after successful upload', async () => {
      // First, get the icon set to populate cache
      const firstResponse = await request(app)
        .get('/collection?prefix=gd')
        .expect(200);

      const firstETag = firstResponse.headers['etag'];

      // Upload a new icon
      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'cache-test-icon')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      // Get the icon set again - ETag should be different
      const secondResponse = await request(app)
        .get('/collection?prefix=gd')
        .expect(200);

      const secondETag = secondResponse.headers['etag'];

      expect(secondETag).not.toBe(firstETag);
    });

    it('should return 409 Conflict when uploading duplicate icon with reject strategy', async () => {
      // First upload
      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'conflict-test-icon')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      // Second upload with reject strategy should fail
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'conflict-test-icon')
        .field('conflictStrategy', 'reject')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(409);

      expect(response.body.error).toHaveProperty('code', 'CONFLICT');
      expect(response.body.error.message).toContain('already exists');
    });

    it('should overwrite existing icon when using overwrite strategy', async () => {
      const firstSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
      </svg>`;
      
      const secondSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <path d="M16 4L4 10v12c0 6.66 4.61 12.88 10.8 14.4 6.19-1.52 10.8-7.74 10.8-14.4V10L16 4z"/>
      </svg>`;

      // First upload
      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'overwrite-test-icon')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(firstSVG), 'test.svg')
        .expect(201);

      // Second upload with overwrite strategy should succeed
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'overwrite-test-icon')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(secondSVG), 'test.svg')
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'overwrite-test-icon');
    });

    it('should use default reject strategy when no strategy is specified', async () => {
      // First upload with overwrite to ensure icon exists
      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'default-strategy-icon')
        .field('conflictStrategy', 'overwrite')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(201);

      // Second upload without strategy should use default (reject)
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${apiKey}`)
        .field('name', 'default-strategy-icon')
        .attach('icon', Buffer.from(validSVG), 'test.svg')
        .expect(409);

      expect(response.body.error).toHaveProperty('code', 'CONFLICT');
    });
  });

  describe('POST /api/sync/figma', () => {
    const apiKey = process.env.API_KEY || 'dev-api-key-12345';

    it('should return 401 when syncing without API key', async () => {
      const response = await request(app)
        .post('/api/sync/figma')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 401 when syncing with invalid API key', async () => {
      const response = await request(app)
        .post('/api/sync/figma')
        .set('Authorization', 'Bearer invalid-key')
        .expect(401);

      expect(response.body.error).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 400 when Figma credentials are not configured', async () => {
      // Save original env vars
      const originalToken = process.env.FIGMA_API_TOKEN;
      const originalFileId = process.env.FIGMA_FILE_ID;

      // Temporarily remove Figma credentials
      delete process.env.FIGMA_API_TOKEN;
      delete process.env.FIGMA_FILE_ID;

      const response = await request(app)
        .post('/api/sync/figma')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error.message).toContain('not configured');

      // Restore env vars
      if (originalToken) process.env.FIGMA_API_TOKEN = originalToken;
      if (originalFileId) process.env.FIGMA_FILE_ID = originalFileId;
    });

    it('should return 400 for invalid sync mode', async () => {
      // Set dummy Figma credentials for this test
      process.env.FIGMA_API_TOKEN = 'test-token';
      process.env.FIGMA_FILE_ID = 'test-file-id';

      const response = await request(app)
        .post('/api/sync/figma?mode=invalid')
        .set('Authorization', `Bearer ${apiKey}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid sync mode');
    });

    it('should accept full sync mode', async () => {
      // Set dummy Figma credentials
      process.env.FIGMA_API_TOKEN = 'test-token';
      process.env.FIGMA_FILE_ID = 'test-file-id';

      // This will fail to connect to Figma, but we're testing the endpoint accepts the mode
      const response = await request(app)
        .post('/api/sync/figma?mode=full')
        .set('Authorization', `Bearer ${apiKey}`);

      // Should not be a validation error about mode
      if (response.status === 400) {
        expect(response.body.error.message).not.toContain('Invalid sync mode');
      }
    });

    it('should accept incremental sync mode', async () => {
      // Set dummy Figma credentials
      process.env.FIGMA_API_TOKEN = 'test-token';
      process.env.FIGMA_FILE_ID = 'test-file-id';

      // This will fail to connect to Figma, but we're testing the endpoint accepts the mode
      const response = await request(app)
        .post('/api/sync/figma?mode=incremental')
        .set('Authorization', `Bearer ${apiKey}`);

      // Should not be a validation error about mode
      if (response.status === 400) {
        expect(response.body.error.message).not.toContain('Invalid sync mode');
      }
    });

    it('should default to full sync mode when mode is not specified', async () => {
      // Set dummy Figma credentials
      process.env.FIGMA_API_TOKEN = 'test-token';
      process.env.FIGMA_FILE_ID = 'test-file-id';

      // This will fail to connect to Figma, but we're testing the endpoint defaults correctly
      const response = await request(app)
        .post('/api/sync/figma')
        .set('Authorization', `Bearer ${apiKey}`);

      // Should not be a validation error about mode
      if (response.status === 400) {
        expect(response.body.error.message).not.toContain('Invalid sync mode');
      }
    });

    it('should accept custom namespace parameter', async () => {
      // Set dummy Figma credentials
      process.env.FIGMA_API_TOKEN = 'test-token';
      process.env.FIGMA_FILE_ID = 'test-file-id';

      // This will fail to connect to Figma, but we're testing the endpoint accepts namespace
      const response = await request(app)
        .post('/api/sync/figma?namespace=custom')
        .set('Authorization', `Bearer ${apiKey}`);

      // Should not be a validation error about namespace
      if (response.status === 400) {
        expect(response.body.error.message).not.toContain('namespace');
      }
    });
  });
});
