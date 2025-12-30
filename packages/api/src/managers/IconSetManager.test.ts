import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IconSetManager } from './IconSetManager.js';
import { StorageLayer } from '../storage/StorageLayer.js';
import { SVGParser } from '../parsers/SVGParser.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('IconSetManager', () => {
  const testBaseDir = 'test-icons-manager';
  const testNamespace = 'gd';
  let manager: IconSetManager;
  let storage: StorageLayer;

  // Sample valid SVG
  const validSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/>
    </svg>
  `;

  const anotherValidSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16">
      <circle cx="8" cy="8" r="6"/>
    </svg>
  `;

  beforeEach(() => {
    storage = new StorageLayer(testBaseDir);
    manager = new IconSetManager(storage, new SVGParser());
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors
    }
  });

  describe('addIcon', () => {
    it('should add a new icon to the icon set', async () => {
      await manager.addIcon(testNamespace, 'test-icon', validSVG);

      const icon = await manager.getIcon(testNamespace, 'test-icon');
      expect(icon).not.toBeNull();
      expect(icon?.body).toBeDefined();
      expect(icon?.width).toBe(24);
      expect(icon?.height).toBe(24);
    });

    it('should update metadata after adding an icon', async () => {
      await manager.addIcon(testNamespace, 'icon1', validSVG);

      const metadata = await storage.readIconSetMetadata(testNamespace);
      expect(metadata).not.toBeNull();
      expect(metadata?.total).toBe(1);
      expect(metadata?.prefix).toBe(testNamespace);
    });

    it('should handle multiple icons', async () => {
      await manager.addIcon(testNamespace, 'icon1', validSVG);
      await manager.addIcon(testNamespace, 'icon2', anotherValidSVG);

      const iconSet = await manager.getAllIcons(testNamespace);
      expect(Object.keys(iconSet.icons).length).toBe(2);
      expect(iconSet.icons['icon1']).toBeDefined();
      expect(iconSet.icons['icon2']).toBeDefined();
    });
  });

  describe('updateIcon', () => {
    it('should update an existing icon', async () => {
      // Add initial icon
      await manager.addIcon(testNamespace, 'test-icon', validSVG);
      
      const initialIcon = await manager.getIcon(testNamespace, 'test-icon');
      expect(initialIcon?.width).toBe(24);

      // Update with different SVG
      await manager.updateIcon(testNamespace, 'test-icon', anotherValidSVG);

      const updatedIcon = await manager.getIcon(testNamespace, 'test-icon');
      expect(updatedIcon?.width).toBe(16);
    });

    it('should update metadata version after update', async () => {
      await manager.addIcon(testNamespace, 'icon1', validSVG);
      const metadata1 = await storage.readIconSetMetadata(testNamespace);
      const version1 = metadata1?.version;

      await manager.updateIcon(testNamespace, 'icon1', anotherValidSVG);
      const metadata2 = await storage.readIconSetMetadata(testNamespace);
      const version2 = metadata2?.version;

      expect(version2).not.toBe(version1);
    });
  });

  describe('removeIcon', () => {
    it('should remove an icon from the icon set', async () => {
      await manager.addIcon(testNamespace, 'test-icon', validSVG);
      
      let icon = await manager.getIcon(testNamespace, 'test-icon');
      expect(icon).not.toBeNull();

      await manager.removeIcon(testNamespace, 'test-icon');

      icon = await manager.getIcon(testNamespace, 'test-icon');
      expect(icon).toBeNull();
    });

    it('should update metadata after removing an icon', async () => {
      await manager.addIcon(testNamespace, 'icon1', validSVG);
      await manager.addIcon(testNamespace, 'icon2', anotherValidSVG);

      let metadata = await storage.readIconSetMetadata(testNamespace);
      expect(metadata?.total).toBe(2);

      await manager.removeIcon(testNamespace, 'icon1');

      metadata = await storage.readIconSetMetadata(testNamespace);
      expect(metadata?.total).toBe(1);
    });
  });

  describe('getIcon', () => {
    it('should return icon data for existing icon', async () => {
      await manager.addIcon(testNamespace, 'test-icon', validSVG);

      const icon = await manager.getIcon(testNamespace, 'test-icon');
      expect(icon).not.toBeNull();
      expect(icon?.body).toBeDefined();
    });

    it('should return null for non-existent icon', async () => {
      const icon = await manager.getIcon(testNamespace, 'non-existent');
      expect(icon).toBeNull();
    });
  });

  describe('getAllIcons', () => {
    it('should return empty icon set for new namespace', async () => {
      const iconSet = await manager.getAllIcons(testNamespace);
      expect(iconSet.prefix).toBe(testNamespace);
      expect(Object.keys(iconSet.icons).length).toBe(0);
    });

    it('should return all icons in the namespace', async () => {
      await manager.addIcon(testNamespace, 'icon1', validSVG);
      await manager.addIcon(testNamespace, 'icon2', anotherValidSVG);
      await manager.addIcon(testNamespace, 'icon3', validSVG);

      const iconSet = await manager.getAllIcons(testNamespace);
      expect(iconSet.prefix).toBe(testNamespace);
      expect(Object.keys(iconSet.icons).length).toBe(3);
      expect(iconSet.icons['icon1']).toBeDefined();
      expect(iconSet.icons['icon2']).toBeDefined();
      expect(iconSet.icons['icon3']).toBeDefined();
    });
  });

  describe('loadIconSet', () => {
    it('should load complete icon set with metadata', async () => {
      await manager.addIcon(testNamespace, 'icon1', validSVG);
      await manager.addIcon(testNamespace, 'icon2', anotherValidSVG);

      const iconSet = await manager.loadIconSet(testNamespace);
      expect(iconSet.prefix).toBe(testNamespace);
      expect(iconSet.lastModified).toBeDefined();
      expect(Object.keys(iconSet.icons).length).toBe(2);
    });
  });

  describe('version management', () => {
    describe('saveVersion', () => {
      it('should save a version of an icon', async () => {
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        const icon = await manager.getIcon(testNamespace, 'test-icon');
        
        const versionId = await manager.saveVersion(testNamespace, 'test-icon', icon!);
        
        expect(versionId).toMatch(/^v\d+$/);
      });

      it('should save version with timestamp-based ID', async () => {
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        const icon = await manager.getIcon(testNamespace, 'test-icon');
        
        const beforeTimestamp = Date.now();
        const versionId = await manager.saveVersion(testNamespace, 'test-icon', icon!);
        const afterTimestamp = Date.now();
        
        const timestamp = parseInt(versionId.substring(1), 10);
        expect(timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
        expect(timestamp).toBeLessThanOrEqual(afterTimestamp);
      });
    });

    describe('getVersionHistory', () => {
      it('should return empty array for icon with no versions', async () => {
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        
        const history = await manager.getVersionHistory(testNamespace, 'test-icon');
        
        expect(history).toEqual([]);
      });

      it('should return version history for icon', async () => {
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        const icon = await manager.getIcon(testNamespace, 'test-icon');
        
        // Save a version
        await manager.saveVersion(testNamespace, 'test-icon', icon!);
        
        const history = await manager.getVersionHistory(testNamespace, 'test-icon');
        
        expect(history.length).toBe(1);
        expect(history[0].id).toMatch(/^v\d+$/);
        expect(history[0].timestamp).toBeGreaterThan(0);
        expect(history[0].data).toBeDefined();
        expect(history[0].data.body).toBeDefined();
      });

      it('should return multiple versions sorted by timestamp (newest first)', async () => {
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        const icon1 = await manager.getIcon(testNamespace, 'test-icon');
        
        // Save first version
        const versionId1 = await manager.saveVersion(testNamespace, 'test-icon', icon1!);
        
        // Wait a bit to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Update and save second version
        await manager.updateIcon(testNamespace, 'test-icon', anotherValidSVG);
        const icon2 = await manager.getIcon(testNamespace, 'test-icon');
        const versionId2 = await manager.saveVersion(testNamespace, 'test-icon', icon2!);
        
        const history = await manager.getVersionHistory(testNamespace, 'test-icon');
        
        // Should have 3 versions: 2 manual saves + 1 from updateIcon
        expect(history.length).toBeGreaterThanOrEqual(2);
        
        // Verify sorted by timestamp (newest first)
        for (let i = 0; i < history.length - 1; i++) {
          expect(history[i].timestamp).toBeGreaterThanOrEqual(history[i + 1].timestamp);
        }
      });

      it('should preserve icon data in version history', async () => {
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        const originalIcon = await manager.getIcon(testNamespace, 'test-icon');
        
        await manager.saveVersion(testNamespace, 'test-icon', originalIcon!);
        
        const history = await manager.getVersionHistory(testNamespace, 'test-icon');
        
        expect(history[0].data.width).toBe(originalIcon?.width);
        expect(history[0].data.height).toBe(originalIcon?.height);
        expect(history[0].data.body).toBe(originalIcon?.body);
      });
    });

    describe('rollbackToVersion', () => {
      it('should rollback icon to a specific version', async () => {
        // Add initial icon
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        const originalIcon = await manager.getIcon(testNamespace, 'test-icon');
        
        // Save version
        const versionId = await manager.saveVersion(testNamespace, 'test-icon', originalIcon!);
        
        // Update icon
        await manager.updateIcon(testNamespace, 'test-icon', anotherValidSVG);
        const updatedIcon = await manager.getIcon(testNamespace, 'test-icon');
        expect(updatedIcon?.width).toBe(16);
        
        // Rollback to original version
        await manager.rollbackToVersion(testNamespace, 'test-icon', versionId);
        
        const rolledBackIcon = await manager.getIcon(testNamespace, 'test-icon');
        expect(rolledBackIcon?.width).toBe(24);
        expect(rolledBackIcon?.body).toBe(originalIcon?.body);
      });

      it('should save current version before rollback', async () => {
        // Add and save version
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        const icon1 = await manager.getIcon(testNamespace, 'test-icon');
        const versionId1 = await manager.saveVersion(testNamespace, 'test-icon', icon1!);
        
        // Update icon
        await manager.updateIcon(testNamespace, 'test-icon', anotherValidSVG);
        
        const historyBefore = await manager.getVersionHistory(testNamespace, 'test-icon');
        const countBefore = historyBefore.length;
        
        // Rollback (should save current before rolling back)
        await manager.rollbackToVersion(testNamespace, 'test-icon', versionId1);
        
        const historyAfter = await manager.getVersionHistory(testNamespace, 'test-icon');
        expect(historyAfter.length).toBeGreaterThan(countBefore);
      });

      it('should throw error for non-existent version', async () => {
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        
        await expect(
          manager.rollbackToVersion(testNamespace, 'test-icon', 'v999999999')
        ).rejects.toThrow('Version not found');
      });

      it('should update metadata after rollback', async () => {
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        const icon = await manager.getIcon(testNamespace, 'test-icon');
        const versionId = await manager.saveVersion(testNamespace, 'test-icon', icon!);
        
        await manager.updateIcon(testNamespace, 'test-icon', anotherValidSVG);
        const metadata1 = await storage.readIconSetMetadata(testNamespace);
        const version1 = metadata1?.version;
        
        await manager.rollbackToVersion(testNamespace, 'test-icon', versionId);
        const metadata2 = await storage.readIconSetMetadata(testNamespace);
        const version2 = metadata2?.version;
        
        expect(version2).not.toBe(version1);
      });
    });

    describe('updateIcon with version management', () => {
      it('should automatically save version when updating icon', async () => {
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        
        // Update should automatically save a version
        await manager.updateIcon(testNamespace, 'test-icon', anotherValidSVG);
        
        const history = await manager.getVersionHistory(testNamespace, 'test-icon');
        expect(history.length).toBeGreaterThanOrEqual(1);
      });

      it('should preserve original data in version when updating', async () => {
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        const originalIcon = await manager.getIcon(testNamespace, 'test-icon');
        
        await manager.updateIcon(testNamespace, 'test-icon', anotherValidSVG);
        
        const history = await manager.getVersionHistory(testNamespace, 'test-icon');
        const savedVersion = history[0];
        
        expect(savedVersion.data.width).toBe(originalIcon?.width);
        expect(savedVersion.data.height).toBe(originalIcon?.height);
      });
    });

    describe('addIcon with overwrite strategy', () => {
      it('should save version when overwriting existing icon', async () => {
        await manager.addIcon(testNamespace, 'test-icon', validSVG);
        
        // Overwrite with same name
        await manager.addIcon(testNamespace, 'test-icon', anotherValidSVG, {
          conflictStrategy: 'overwrite'
        });
        
        const history = await manager.getVersionHistory(testNamespace, 'test-icon');
        expect(history.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
