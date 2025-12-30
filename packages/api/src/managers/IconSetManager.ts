import { IconData, IconSet, Version } from '../types/icon.js';
import { SVGParser } from '../parsers/SVGParser.js';
import { StorageLayer } from '../storage/StorageLayer.js';
import { ConflictError } from '../types/errors.js';
import logger from '../utils/logger.js';

/**
 * IconSetManager manages the lifecycle of icon sets
 * Implements requirements 1.1, 1.2, 2.1, 2.5
 */
export class IconSetManager {
  private svgParser: SVGParser;
  private storage: StorageLayer;

  constructor(storage?: StorageLayer, svgParser?: SVGParser) {
    this.storage = storage || new StorageLayer();
    this.svgParser = svgParser || new SVGParser();
  }

  /**
   * Load complete icon set from storage layer
   * 
   * @param namespace - Icon set namespace (e.g., "gd")
   * @returns Promise<IconSet> - Complete icon set with all icons
   */
  async loadIconSet(namespace: string): Promise<IconSet> {
    try {
      logger.debug(`Loading icon set: ${namespace}`);
      
      // Get list of all icons in the namespace
      const iconNames = await this.storage.listIcons(namespace);

      // Load all icon data
      const icons: { [name: string]: IconData } = {};
      
      for (const name of iconNames) {
        const iconData = await this.storage.readIcon(namespace, name);
        if (iconData) {
          icons[name] = iconData;
        }
      }

      // Read metadata if available
      const metadata = await this.storage.readIconSetMetadata(namespace);

      // Create icon set
      const iconSet: IconSet = {
        prefix: namespace,
        icons,
        lastModified: metadata?.lastModified || Date.now(),
      };

      logger.info(`Icon set loaded successfully`, {
        namespace,
        iconCount: Object.keys(icons).length,
      });

      return iconSet;
    } catch (error) {
      logger.error(`Failed to load icon set: ${namespace}`, {
        namespace,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Add a new icon to the icon set
   * Parses SVG and stores it
   * 
   * @param namespace - Icon set namespace
   * @param name - Icon name
   * @param svg - Raw SVG string
   * @param options - Optional configuration for conflict handling
   * @returns Promise<void>
   */
  async addIcon(
    namespace: string, 
    name: string, 
    svg: string,
    options?: { conflictStrategy?: 'overwrite' | 'reject' }
  ): Promise<void> {
    try {
      logger.info(`Adding icon: ${namespace}:${name}`);
      
      // Check if icon already exists
      const existingIcon = await this.storage.readIcon(namespace, name);
      
      // Determine conflict strategy (from options, env, or default to 'reject')
      const conflictStrategy = options?.conflictStrategy 
        || process.env.ICON_CONFLICT_STRATEGY 
        || 'reject';
      
      if (existingIcon) {
        logger.info(`Icon already exists: ${namespace}:${name}`, {
          namespace,
          name,
          conflictStrategy,
        });
        
        if (conflictStrategy === 'reject') {
          // Reject the operation with 409 Conflict
          throw new ConflictError(
            `Icon "${name}" already exists in namespace "${namespace}". Use overwrite strategy to replace it.`,
            { namespace, name, conflictStrategy }
          );
        } else if (conflictStrategy === 'overwrite') {
          // Save version before overwriting
          logger.info(`Overwriting existing icon and saving version: ${namespace}:${name}`);
          await this.saveVersion(namespace, name, existingIcon);
        }
      }
      
      // Parse SVG to IconData format
      const iconData = await this.svgParser.parseSVG(svg);

      // Save icon to storage
      await this.storage.saveIcon(namespace, name, iconData);

      // Update metadata
      await this.updateMetadata(namespace);
      
      logger.info(`Icon added successfully: ${namespace}:${name}`);
    } catch (error) {
      logger.error(`Failed to add icon: ${namespace}:${name}`, {
        namespace,
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update an existing icon
   * 
   * @param namespace - Icon set namespace
   * @param name - Icon name
   * @param svg - Raw SVG string
   * @returns Promise<void>
   */
  async updateIcon(namespace: string, name: string, svg: string): Promise<void> {
    try {
      logger.info(`Updating icon: ${namespace}:${name}`);
      
      // Save current version before updating
      const existingIcon = await this.storage.readIcon(namespace, name);
      if (existingIcon) {
        await this.saveVersion(namespace, name, existingIcon);
      }
      
      // Parse SVG to IconData format
      const iconData = await this.svgParser.parseSVG(svg);

      // Save icon to storage (overwrites existing)
      await this.storage.saveIcon(namespace, name, iconData);

      // Update metadata
      await this.updateMetadata(namespace);
      
      logger.info(`Icon updated successfully: ${namespace}:${name}`);
    } catch (error) {
      logger.error(`Failed to update icon: ${namespace}:${name}`, {
        namespace,
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Remove an icon from the icon set
   * 
   * @param namespace - Icon set namespace
   * @param name - Icon name
   * @returns Promise<void>
   */
  async removeIcon(namespace: string, name: string): Promise<void> {
    try {
      logger.info(`Removing icon: ${namespace}:${name}`);
      
      // Delete icon from storage
      await this.storage.deleteIcon(namespace, name);

      // Update metadata
      await this.updateMetadata(namespace);
      
      logger.info(`Icon removed successfully: ${namespace}:${name}`);
    } catch (error) {
      logger.error(`Failed to remove icon: ${namespace}:${name}`, {
        namespace,
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get a single icon
   * 
   * @param namespace - Icon set namespace
   * @param name - Icon name
   * @returns Promise<IconData | null> - Icon data or null if not found
   */
  async getIcon(namespace: string, name: string): Promise<IconData | null> {
    return await this.storage.readIcon(namespace, name);
  }

  /**
   * Get all icons in the icon set
   * 
   * @param namespace - Icon set namespace
   * @returns Promise<IconSet> - Complete icon set
   */
  async getAllIcons(namespace: string): Promise<IconSet> {
    return await this.loadIconSet(namespace);
  }

  /**
   * Update icon set metadata
   * Updates total count, version, and last modified timestamp
   * 
   * @param namespace - Icon set namespace
   * @returns Promise<void>
   */
  private async updateMetadata(namespace: string): Promise<void> {
    // Get current icon count
    const iconNames = await this.storage.listIcons(namespace);
    const total = iconNames.length;

    // Read existing metadata or create new
    const existingMetadata = await this.storage.readIconSetMetadata(namespace);
    
    // Generate new version (increment or use timestamp)
    const version = existingMetadata 
      ? this.incrementVersion(existingMetadata.version)
      : '1.0.0';

    // Create updated metadata
    const metadata = {
      prefix: namespace,
      name: existingMetadata?.name || namespace,
      total,
      version,
      author: existingMetadata?.author,
      license: existingMetadata?.license,
      lastModified: Date.now(),
    };

    // Save metadata
    await this.storage.saveIconSetMetadata(namespace, metadata);
  }

  /**
   * Increment version number
   * Simple semantic versioning increment (patch version)
   * 
   * @param currentVersion - Current version string (e.g., "1.0.0")
   * @returns string - Incremented version
   */
  private incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    if (parts.length === 3) {
      const patch = parseInt(parts[2], 10);
      if (!isNaN(patch)) {
        parts[2] = (patch + 1).toString();
        return parts.join('.');
      }
    }
    // Fallback: use timestamp-based version
    return `1.0.${Date.now()}`;
  }

  /**
   * Save a version of an icon before it's overwritten
   * Implements requirement 8.1 - Version management
   * 
   * @param namespace - Icon set namespace
   * @param name - Icon name
   * @param iconData - Icon data to save as version
   * @returns Promise<string> - Version ID
   */
  async saveVersion(namespace: string, name: string, iconData: IconData): Promise<string> {
    try {
      const timestamp = Date.now();
      const versionId = `v${timestamp}`;
      
      logger.info(`Saving version for icon: ${namespace}:${name}`, {
        namespace,
        name,
        versionId,
      });
      
      // Save version to storage
      await this.storage.saveIconVersion(namespace, name, versionId, iconData);
      
      logger.info(`Version saved successfully: ${namespace}:${name}:${versionId}`);
      
      return versionId;
    } catch (error) {
      logger.error(`Failed to save version: ${namespace}:${name}`, {
        namespace,
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get version history for an icon
   * Implements requirement 8.2 - Version history
   * 
   * @param namespace - Icon set namespace
   * @param name - Icon name
   * @returns Promise<Version[]> - Array of versions sorted by timestamp (newest first)
   */
  async getVersionHistory(namespace: string, name: string): Promise<Version[]> {
    try {
      logger.info(`Getting version history for icon: ${namespace}:${name}`);
      
      // Get list of version IDs
      const versionIds = await this.storage.listIconVersions(namespace, name);
      
      // Load each version's data
      const versions: Version[] = [];
      for (const versionId of versionIds) {
        const data = await this.storage.readIconVersion(namespace, name, versionId);
        if (data) {
          // Extract timestamp from version ID (format: v{timestamp})
          const timestamp = parseInt(versionId.substring(1), 10);
          
          versions.push({
            id: versionId,
            timestamp: isNaN(timestamp) ? 0 : timestamp,
            data,
          });
        }
      }
      
      // Sort by timestamp (newest first)
      versions.sort((a, b) => b.timestamp - a.timestamp);
      
      logger.info(`Version history retrieved: ${namespace}:${name}`, {
        namespace,
        name,
        versionCount: versions.length,
      });
      
      return versions;
    } catch (error) {
      logger.error(`Failed to get version history: ${namespace}:${name}`, {
        namespace,
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Rollback an icon to a specific version
   * Implements requirement 8.3 - Version rollback
   * 
   * @param namespace - Icon set namespace
   * @param name - Icon name
   * @param versionId - Version ID to rollback to
   * @returns Promise<void>
   */
  async rollbackToVersion(namespace: string, name: string, versionId: string): Promise<void> {
    try {
      logger.info(`Rolling back icon to version: ${namespace}:${name}:${versionId}`);
      
      // Read the version data
      const versionData = await this.storage.readIconVersion(namespace, name, versionId);
      
      if (!versionData) {
        throw new Error(`Version not found: ${versionId}`);
      }
      
      // Save current version before rollback
      const currentIcon = await this.storage.readIcon(namespace, name);
      if (currentIcon) {
        await this.saveVersion(namespace, name, currentIcon);
      }
      
      // Restore the version as the current icon
      await this.storage.saveIcon(namespace, name, versionData);
      
      // Update metadata
      await this.updateMetadata(namespace);
      
      logger.info(`Icon rolled back successfully: ${namespace}:${name}:${versionId}`);
    } catch (error) {
      logger.error(`Failed to rollback icon: ${namespace}:${name}:${versionId}`, {
        namespace,
        name,
        versionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
