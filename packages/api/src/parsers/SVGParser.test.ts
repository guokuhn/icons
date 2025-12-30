import { describe, it, expect } from 'vitest';
import { SVGParser } from './SVGParser.js';

describe('SVGParser', () => {
  const parser = new SVGParser();

  describe('validateSVG', () => {
    it('should validate a simple valid SVG', () => {
      const validSVG = '<svg><path d="M0 0L10 10"/></svg>';
      expect(parser.validateSVG(validSVG)).toBe(true);
    });

    it('should reject empty string', () => {
      expect(parser.validateSVG('')).toBe(false);
    });

    it('should reject non-SVG content', () => {
      expect(parser.validateSVG('not xml')).toBe(false);
    });

    it('should reject SVG without closing tag', () => {
      const invalidSVG = '<svg><path d="M0 0L10 10"/>';
      expect(parser.validateSVG(invalidSVG)).toBe(false);
    });
  });

  describe('extractMetadata', () => {
    it('should extract viewBox', () => {
      const svg = '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>';
      const metadata = parser.extractMetadata(svg);
      expect(metadata.viewBox).toBe('0 0 24 24');
    });

    it('should extract width and height', () => {
      const svg = '<svg width="24" height="24"><path d="M0 0"/></svg>';
      const metadata = parser.extractMetadata(svg);
      expect(metadata.width).toBe('24');
      expect(metadata.height).toBe('24');
    });

    it('should detect valid path data', () => {
      const svg = '<svg><path d="M0 0L10 10"/></svg>';
      const metadata = parser.extractMetadata(svg);
      expect(metadata.hasValidPath).toBe(true);
    });

    it('should detect circle as valid path', () => {
      const svg = '<svg><circle cx="10" cy="10" r="5"/></svg>';
      const metadata = parser.extractMetadata(svg);
      expect(metadata.hasValidPath).toBe(true);
    });

    it('should return false for SVG without path data', () => {
      const svg = '<svg></svg>';
      const metadata = parser.extractMetadata(svg);
      expect(metadata.hasValidPath).toBe(false);
    });
  });

  describe('optimizeSVG', () => {
    it('should optimize a valid SVG', async () => {
      const svg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M0 0L10 10"/></svg>';
      const optimized = await parser.optimizeSVG(svg);
      expect(optimized).toBeTruthy();
      expect(optimized).toContain('svg');
    });

    it('should handle optimization errors gracefully', async () => {
      const invalidSVG = 'not valid svg';
      const result = await parser.optimizeSVG(invalidSVG);
      // Should return original on error
      expect(result).toBe(invalidSVG);
    });
  });

  describe('parseSVG', () => {
    it('should parse a simple SVG with viewBox', async () => {
      const svg = '<svg viewBox="0 0 24 24"><path d="M0 0L10 10"/></svg>';
      const iconData = await parser.parseSVG(svg);
      
      expect(iconData).toBeDefined();
      expect(iconData.body).toBeTruthy();
      expect(iconData.width).toBe(24);
      expect(iconData.height).toBe(24);
    });

    it('should parse SVG with width and height attributes', async () => {
      const svg = '<svg width="32" height="32" viewBox="0 0 32 32"><path d="M0 0L10 10"/></svg>';
      const iconData = await parser.parseSVG(svg);
      
      expect(iconData).toBeDefined();
      expect(iconData.width).toBe(32);
      expect(iconData.height).toBe(32);
    });

    it('should reject invalid SVG', async () => {
      const invalidSVG = 'not valid svg';
      await expect(parser.parseSVG(invalidSVG)).rejects.toThrow('Invalid SVG format');
    });

    it('should reject SVG without path data', async () => {
      const svg = '<svg viewBox="0 0 24 24"></svg>';
      await expect(parser.parseSVG(svg)).rejects.toThrow('does not contain valid path data');
    });

    it('should parse SVG with circle element', async () => {
      const svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';
      const iconData = await parser.parseSVG(svg);
      
      expect(iconData).toBeDefined();
      expect(iconData.body).toBeTruthy();
      expect(iconData.width).toBe(24);
      expect(iconData.height).toBe(24);
    });
  });
});
