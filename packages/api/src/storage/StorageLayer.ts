import { promises as fs } from 'fs';
import path from 'path';
import { IconData, IconSetMetadata } from '../types/icon.js';
import logger from '../utils/logger.js';
import { StorageError, NotFoundError } from '../types/errors.js';

/**
 * StorageLayer manages file system operations for icon storage
 */
export class StorageLayer {
  private baseDir: string;

  constructor(baseDir: string = 'icons') {
    this.baseDir = baseDir;
  }

  /**
   * Get the directory path for a namespace
   */
  private getNamespaceDir(namespace: string): string {
    return path.join(this.baseDir, namespace);
  }

  /**
   * Get the icons directory path for a namespace
   */
  private getIconsDir(namespace: string): string {
    return path.join(this.getNamespaceDir(namespace), 'icons');
  }

  /**
   * Get the versions directory path for a namespace
   */
  private getVersionsDir(namespace: string): string {
    return path.join(this.getNamespaceDir(namespace), 'versions');
  }

  /**
   * Get the source directory path for a namespace
   */
  private getSourceDir(namespace: string): string {
    return path.join(this.getNamespaceDir(namespace), 'source');
  }

  /**
   * Get the file path for an icon
   */
  private getIconPath(namespace: string, name: string): string {
    return path.join(this.getIconsDir(namespace), `${name}.json`);
  }

  /**
   * Get the file path for icon set metadata
   */
  private getMetadataPath(namespace: string): string {
    return path.join(this.getNamespaceDir(namespace), 'metadata.json');
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  private async ensureDir(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'EEXIST') {
        logger.error(`Failed to create directory: ${dirPath}`, {
          error: nodeError.message,
          code: nodeError.code,
          path: dirPath,
        });
        throw new StorageError(`Failed to create directory: ${dirPath}`, {
          path: dirPath,
          originalError: nodeError.message,
        });
      }
    }
  }

  /**
   * Initialize directory structure for a namespace
   */
  async initializeNamespace(namespace: string): Promise<void> {
    await this.ensureDir(this.getIconsDir(namespace));
    await this.ensureDir(this.getVersionsDir(namespace));
    await this.ensureDir(this.getSourceDir(namespace));
  }

  /**
   * Save icon data to file system
   */
  async saveIcon(namespace: string, name: string, data: IconData): Promise<void> {
    try {
      await this.initializeNamespace(namespace);
      const iconPath = this.getIconPath(namespace, name);
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(iconPath, jsonData, 'utf-8');
      
      logger.info(`Icon saved successfully`, {
        namespace,
        name,
        path: iconPath,
      });
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      logger.error(`Failed to save icon: ${namespace}:${name}`, {
        namespace,
        name,
        error: nodeError.message,
        code: nodeError.code,
      });
      
      if (error instanceof StorageError) {
        throw error;
      }
      
      throw new StorageError(`Failed to save icon: ${namespace}:${name}`, {
        namespace,
        name,
        originalError: nodeError.message,
      });
    }
  }

  /**
   * Read icon data from file system
   */
  async readIcon(namespace: string, name: string): Promise<IconData | null> {
    try {
      const iconPath = this.getIconPath(namespace, name);
      const jsonData = await fs.readFile(iconPath, 'utf-8');
      const data = JSON.parse(jsonData) as IconData;
      
      logger.debug(`Icon read successfully`, {
        namespace,
        name,
      });
      
      return data;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      
      if (nodeError.code === 'ENOENT') {
        logger.debug(`Icon not found: ${namespace}:${name}`);
        return null;
      }
      
      logger.error(`Failed to read icon: ${namespace}:${name}`, {
        namespace,
        name,
        error: nodeError.message,
        code: nodeError.code,
      });
      
      throw new StorageError(`Failed to read icon: ${namespace}:${name}`, {
        namespace,
        name,
        originalError: nodeError.message,
      });
    }
  }

  /**
   * Delete icon file from file system
   */
  async deleteIcon(namespace: string, name: string): Promise<void> {
    const iconPath = this.getIconPath(namespace, name);
    try {
      await fs.unlink(iconPath);
      
      logger.info(`Icon deleted successfully`, {
        namespace,
        name,
        path: iconPath,
      });
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      
      if (nodeError.code !== 'ENOENT') {
        logger.error(`Failed to delete icon: ${namespace}:${name}`, {
          namespace,
          name,
          error: nodeError.message,
          code: nodeError.code,
        });
        
        throw new StorageError(`Failed to delete icon: ${namespace}:${name}`, {
          namespace,
          name,
          originalError: nodeError.message,
        });
      }
      
      // If file doesn't exist, consider it already deleted (idempotent)
      logger.debug(`Icon already deleted or not found: ${namespace}:${name}`);
    }
  }

  /**
   * List all icons in a namespace
   */
  async listIcons(namespace: string): Promise<string[]> {
    try {
      const iconsDir = this.getIconsDir(namespace);
      const files = await fs.readdir(iconsDir);
      const icons = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
      
      logger.debug(`Listed icons in namespace: ${namespace}`, {
        namespace,
        count: icons.length,
      });
      
      return icons;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      
      if (nodeError.code === 'ENOENT') {
        logger.debug(`Namespace directory not found: ${namespace}`);
        return [];
      }
      
      logger.error(`Failed to list icons in namespace: ${namespace}`, {
        namespace,
        error: nodeError.message,
        code: nodeError.code,
      });
      
      throw new StorageError(`Failed to list icons in namespace: ${namespace}`, {
        namespace,
        originalError: nodeError.message,
      });
    }
  }

  /**
   * Save icon set metadata
   */
  async saveIconSetMetadata(namespace: string, metadata: IconSetMetadata): Promise<void> {
    try {
      await this.initializeNamespace(namespace);
      const metadataPath = this.getMetadataPath(namespace);
      const jsonData = JSON.stringify(metadata, null, 2);
      await fs.writeFile(metadataPath, jsonData, 'utf-8');
      
      logger.info(`Icon set metadata saved`, {
        namespace,
        total: metadata.total,
        version: metadata.version,
      });
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      logger.error(`Failed to save icon set metadata: ${namespace}`, {
        namespace,
        error: nodeError.message,
        code: nodeError.code,
      });
      
      if (error instanceof StorageError) {
        throw error;
      }
      
      throw new StorageError(`Failed to save icon set metadata: ${namespace}`, {
        namespace,
        originalError: nodeError.message,
      });
    }
  }

  /**
   * Read icon set metadata
   */
  async readIconSetMetadata(namespace: string): Promise<IconSetMetadata | null> {
    try {
      const metadataPath = this.getMetadataPath(namespace);
      const jsonData = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(jsonData) as IconSetMetadata;
      
      logger.debug(`Icon set metadata read`, {
        namespace,
        total: metadata.total,
        version: metadata.version,
      });
      
      return metadata;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      
      if (nodeError.code === 'ENOENT') {
        logger.debug(`Icon set metadata not found: ${namespace}`);
        return null;
      }
      
      logger.error(`Failed to read icon set metadata: ${namespace}`, {
        namespace,
        error: nodeError.message,
        code: nodeError.code,
      });
      
      throw new StorageError(`Failed to read icon set metadata: ${namespace}`, {
        namespace,
        originalError: nodeError.message,
      });
    }
  }

  /**
   * Save a version of an icon
   * Implements requirement 8.1 - Version management
   */
  async saveIconVersion(
    namespace: string,
    name: string,
    versionId: string,
    data: IconData
  ): Promise<void> {
    try {
      // Ensure versions directory exists
      const iconVersionsDir = path.join(this.getVersionsDir(namespace), name);
      await this.ensureDir(iconVersionsDir);
      
      // Save version file
      const versionPath = path.join(iconVersionsDir, `${versionId}.json`);
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(versionPath, jsonData, 'utf-8');
      
      logger.info(`Icon version saved successfully`, {
        namespace,
        name,
        versionId,
        path: versionPath,
      });
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      logger.error(`Failed to save icon version: ${namespace}:${name}:${versionId}`, {
        namespace,
        name,
        versionId,
        error: nodeError.message,
        code: nodeError.code,
      });
      
      if (error instanceof StorageError) {
        throw error;
      }
      
      throw new StorageError(`Failed to save icon version: ${namespace}:${name}:${versionId}`, {
        namespace,
        name,
        versionId,
        originalError: nodeError.message,
      });
    }
  }

  /**
   * List all versions for an icon
   * Implements requirement 8.2 - Version history
   */
  async listIconVersions(namespace: string, name: string): Promise<string[]> {
    try {
      const iconVersionsDir = path.join(this.getVersionsDir(namespace), name);
      const files = await fs.readdir(iconVersionsDir);
      const versions = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
      
      logger.debug(`Listed versions for icon: ${namespace}:${name}`, {
        namespace,
        name,
        count: versions.length,
      });
      
      return versions;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      
      if (nodeError.code === 'ENOENT') {
        logger.debug(`No versions found for icon: ${namespace}:${name}`);
        return [];
      }
      
      logger.error(`Failed to list versions for icon: ${namespace}:${name}`, {
        namespace,
        name,
        error: nodeError.message,
        code: nodeError.code,
      });
      
      throw new StorageError(`Failed to list versions for icon: ${namespace}:${name}`, {
        namespace,
        name,
        originalError: nodeError.message,
      });
    }
  }

  /**
   * Read a specific version of an icon
   * Implements requirement 8.2 - Version history
   */
  async readIconVersion(
    namespace: string,
    name: string,
    versionId: string
  ): Promise<IconData | null> {
    try {
      const iconVersionsDir = path.join(this.getVersionsDir(namespace), name);
      const versionPath = path.join(iconVersionsDir, `${versionId}.json`);
      const jsonData = await fs.readFile(versionPath, 'utf-8');
      const data = JSON.parse(jsonData) as IconData;
      
      logger.debug(`Icon version read successfully`, {
        namespace,
        name,
        versionId,
      });
      
      return data;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      
      if (nodeError.code === 'ENOENT') {
        logger.debug(`Icon version not found: ${namespace}:${name}:${versionId}`);
        return null;
      }
      
      logger.error(`Failed to read icon version: ${namespace}:${name}:${versionId}`, {
        namespace,
        name,
        versionId,
        error: nodeError.message,
        code: nodeError.code,
      });
      
      throw new StorageError(`Failed to read icon version: ${namespace}:${name}:${versionId}`, {
        namespace,
        name,
        versionId,
        originalError: nodeError.message,
      });
    }
  }
}
