import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StorageLayer } from './StorageLayer.js';
import { IconData, IconSetMetadata } from '../types/icon.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('StorageLayer', () => {
  const testBaseDir = 'test-icons';
  const testNamespace = 'gd';
  let storage: StorageLayer;

  beforeEach(async () => {
    storage = new StorageLayer(testBaseDir);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('Directory Structure', () => {
    it('should create namespace directory structure', async () => {
      await storage.initializeNamespace(testNamespace);

      const iconsDir = path.join(testBaseDir, testNamespace, 'icons');
      const versionsDir = path.join(testBaseDir, testNamespace, 'versions');
      const sourceDir = path.join(testBaseDir, testNamespace, 'source');

      const iconsDirExists = await fs.stat(iconsDir).then(() => true).catch(() => false);
      const versionsDirExists = await fs.stat(versionsDir).then(() => true).catch(() => false);
      const sourceDirExists = await fs.stat(sourceDir).then(() => true).catch(() => false);

      expect(iconsDirExists).toBe(true);
      expect(versionsDirExists).toBe(true);
      expect(sourceDirExists).toBe(true);
    });
  });

  describe('Icon Operations', () => {
    it('should save and read icon data', async () => {
      const iconData: IconData = {
        body: '<path d="M10 10 L20 20"/>',
        width: 24,
        height: 24,
      };

      await storage.saveIcon(testNamespace, 'test-icon', iconData);
      const readData = await storage.readIcon(testNamespace, 'test-icon');

      expect(readData).toEqual(iconData);
    });

    it('should return null for non-existent icon', async () => {
      const readData = await storage.readIcon(testNamespace, 'non-existent');
      expect(readData).toBeNull();
    });

    it('should delete icon', async () => {
      const iconData: IconData = {
        body: '<path d="M10 10 L20 20"/>',
        width: 24,
        height: 24,
      };

      await storage.saveIcon(testNamespace, 'test-icon', iconData);
      await storage.deleteIcon(testNamespace, 'test-icon');
      const readData = await storage.readIcon(testNamespace, 'test-icon');

      expect(readData).toBeNull();
    });

    it('should list all icons in namespace', async () => {
      const icon1: IconData = { body: '<path d="M10 10"/>', width: 24, height: 24 };
      const icon2: IconData = { body: '<path d="M20 20"/>', width: 24, height: 24 };

      await storage.saveIcon(testNamespace, 'icon1', icon1);
      await storage.saveIcon(testNamespace, 'icon2', icon2);

      const icons = await storage.listIcons(testNamespace);

      expect(icons).toHaveLength(2);
      expect(icons).toContain('icon1');
      expect(icons).toContain('icon2');
    });

    it('should return empty array for namespace with no icons', async () => {
      const icons = await storage.listIcons(testNamespace);
      expect(icons).toEqual([]);
    });
  });

  describe('Metadata Operations', () => {
    it('should save and read icon set metadata', async () => {
      const metadata: IconSetMetadata = {
        prefix: 'gd',
        name: 'Test Icon Set',
        total: 10,
        version: '1.0.0',
        author: 'Test Author',
        license: 'MIT',
        lastModified: Date.now(),
      };

      await storage.saveIconSetMetadata(testNamespace, metadata);
      const readMetadata = await storage.readIconSetMetadata(testNamespace);

      expect(readMetadata).toEqual(metadata);
    });

    it('should return null for non-existent metadata', async () => {
      const readMetadata = await storage.readIconSetMetadata(testNamespace);
      expect(readMetadata).toBeNull();
    });
  });

  describe('Version Management', () => {
    const iconData: IconData = {
      body: '<path d="M10 10 L20 20"/>',
      width: 24,
      height: 24,
    };

    describe('saveIconVersion', () => {
      it('should save icon version', async () => {
        const versionId = 'v1234567890';
        
        await storage.saveIconVersion(testNamespace, 'test-icon', versionId, iconData);
        
        // Verify version file exists
        const versionPath = path.join(testBaseDir, testNamespace, 'versions', 'test-icon', `${versionId}.json`);
        const exists = await fs.stat(versionPath).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      });

      it('should create version directory if it does not exist', async () => {
        const versionId = 'v1234567890';
        
        await storage.saveIconVersion(testNamespace, 'test-icon', versionId, iconData);
        
        const versionDir = path.join(testBaseDir, testNamespace, 'versions', 'test-icon');
        const exists = await fs.stat(versionDir).then(() => true).catch(() => false);
        expect(exists).toBe(true);
      });
    });

    describe('listIconVersions', () => {
      it('should list all versions for an icon', async () => {
        const versionId1 = 'v1234567890';
        const versionId2 = 'v1234567891';
        
        await storage.saveIconVersion(testNamespace, 'test-icon', versionId1, iconData);
        await storage.saveIconVersion(testNamespace, 'test-icon', versionId2, iconData);
        
        const versions = await storage.listIconVersions(testNamespace, 'test-icon');
        
        expect(versions).toHaveLength(2);
        expect(versions).toContain(versionId1);
        expect(versions).toContain(versionId2);
      });

      it('should return empty array for icon with no versions', async () => {
        const versions = await storage.listIconVersions(testNamespace, 'test-icon');
        expect(versions).toEqual([]);
      });

      it('should only return .json files', async () => {
        const versionId = 'v1234567890';
        
        await storage.saveIconVersion(testNamespace, 'test-icon', versionId, iconData);
        
        // Create a non-json file in the versions directory
        const versionDir = path.join(testBaseDir, testNamespace, 'versions', 'test-icon');
        await fs.writeFile(path.join(versionDir, 'readme.txt'), 'test', 'utf-8');
        
        const versions = await storage.listIconVersions(testNamespace, 'test-icon');
        
        expect(versions).toHaveLength(1);
        expect(versions).toContain(versionId);
      });
    });

    describe('readIconVersion', () => {
      it('should read icon version data', async () => {
        const versionId = 'v1234567890';
        
        await storage.saveIconVersion(testNamespace, 'test-icon', versionId, iconData);
        const readData = await storage.readIconVersion(testNamespace, 'test-icon', versionId);
        
        expect(readData).toEqual(iconData);
      });

      it('should return null for non-existent version', async () => {
        const readData = await storage.readIconVersion(testNamespace, 'test-icon', 'v999999999');
        expect(readData).toBeNull();
      });

      it('should preserve all icon data fields', async () => {
        const complexIconData: IconData = {
          body: '<path d="M10 10 L20 20"/>',
          width: 24,
          height: 24,
          left: 2,
          top: 2,
          rotate: 90,
          hFlip: true,
          vFlip: false,
        };
        const versionId = 'v1234567890';
        
        await storage.saveIconVersion(testNamespace, 'test-icon', versionId, complexIconData);
        const readData = await storage.readIconVersion(testNamespace, 'test-icon', versionId);
        
        expect(readData).toEqual(complexIconData);
      });
    });

    describe('multiple icons with versions', () => {
      it('should handle versions for multiple icons independently', async () => {
        const icon1Data: IconData = { body: '<path d="M10 10"/>', width: 24, height: 24 };
        const icon2Data: IconData = { body: '<path d="M20 20"/>', width: 16, height: 16 };
        
        await storage.saveIconVersion(testNamespace, 'icon1', 'v1', icon1Data);
        await storage.saveIconVersion(testNamespace, 'icon2', 'v1', icon2Data);
        
        const icon1Versions = await storage.listIconVersions(testNamespace, 'icon1');
        const icon2Versions = await storage.listIconVersions(testNamespace, 'icon2');
        
        expect(icon1Versions).toHaveLength(1);
        expect(icon2Versions).toHaveLength(1);
        
        const icon1VersionData = await storage.readIconVersion(testNamespace, 'icon1', 'v1');
        const icon2VersionData = await storage.readIconVersion(testNamespace, 'icon2', 'v1');
        
        expect(icon1VersionData).toEqual(icon1Data);
        expect(icon2VersionData).toEqual(icon2Data);
      });
    });
  });
});
