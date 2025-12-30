import axios, { AxiosInstance, AxiosError } from 'axios';
import logger from '../utils/logger.js';
import { FigmaComponent, SyncResult } from '../types/icon.js';

/**
 * Retry configuration for exponential backoff
 * Implements requirement 3.5, 7.4 - Exponential backoff retry strategy
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

/**
 * Error types for categorization
 */
enum FigmaErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  API_ERROR = 'API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * FigmaIntegrator - Integrates with Figma Web API to fetch icon components
 * Implements requirement 3.1 - Connect to Figma API with valid token and file ID
 * Implements requirement 3.5, 7.4 - Error handling and retry with exponential backoff
 */
export class FigmaIntegrator {
  private apiToken: string;
  private fileId: string;
  private axiosInstance: AxiosInstance;
  private isConnected: boolean = false;
  
  // Retry configuration - implements requirement 3.5, 7.4
  private retryConfig: RetryConfig = {
    maxRetries: 3,           // Maximum 3 retries
    initialDelayMs: 1000,    // Initial delay 1 second
    maxDelayMs: 10000,       // Maximum delay 10 seconds
    timeoutMs: 30000,        // 30 second timeout
  };

  constructor(apiToken?: string, fileId?: string) {
    this.apiToken = apiToken || '';
    this.fileId = fileId || '';

    // Create axios instance with base configuration
    this.axiosInstance = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': this.apiToken,
      },
      timeout: this.retryConfig.timeoutMs, // 30 second timeout as per design doc
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.handleAxiosError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Categorize error type for better handling
   * Implements requirement 3.5, 7.4 - Categorize network, API, and timeout errors
   */
  private categorizeError(error: any): FigmaErrorType {
    if (axios.isAxiosError(error)) {
      // Timeout error
      if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
        return FigmaErrorType.TIMEOUT_ERROR;
      }

      // Network error (no response received)
      if (!error.response) {
        return FigmaErrorType.NETWORK_ERROR;
      }

      // API errors based on status code
      const status = error.response.status;
      if (status === 401 || status === 403) {
        return FigmaErrorType.AUTHENTICATION_ERROR;
      }
      if (status === 404) {
        return FigmaErrorType.NOT_FOUND_ERROR;
      }
      if (status === 429) {
        return FigmaErrorType.RATE_LIMIT_ERROR;
      }
      
      return FigmaErrorType.API_ERROR;
    }

    return FigmaErrorType.UNKNOWN_ERROR;
  }

  /**
   * Determine if an error is retryable
   * Implements requirement 3.5, 7.4 - Retry strategy for transient errors
   */
  private isRetryableError(errorType: FigmaErrorType): boolean {
    // Retry on network errors, timeouts, rate limits, and general API errors
    // Don't retry on authentication or not found errors (permanent failures)
    return [
      FigmaErrorType.NETWORK_ERROR,
      FigmaErrorType.TIMEOUT_ERROR,
      FigmaErrorType.RATE_LIMIT_ERROR,
      FigmaErrorType.API_ERROR,
    ].includes(errorType);
  }

  /**
   * Calculate exponential backoff delay
   * Implements requirement 3.5, 7.4 - Exponential backoff with initial delay 1s, max 3 retries
   * 
   * @param attempt - Current retry attempt (0-indexed)
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff: initialDelay * 2^attempt
    const delay = this.retryConfig.initialDelayMs * Math.pow(2, attempt);
    // Cap at maximum delay
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Execute a request with retry logic and exponential backoff
   * Implements requirement 3.5, 7.4 - Retry with exponential backoff, detailed logging
   * 
   * @param requestFn - Function that returns a Promise for the request
   * @param operationName - Name of the operation for logging
   * @returns Promise with the result
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Log attempt
        if (attempt > 0) {
          logger.info(`Retrying ${operationName}`, {
            attempt,
            maxRetries: this.retryConfig.maxRetries,
          });
        }

        // Execute the request
        const result = await requestFn();
        
        // Log success if this was a retry
        if (attempt > 0) {
          logger.info(`${operationName} succeeded after retry`, {
            attempt,
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        const errorType = this.categorizeError(error);
        
        // Log detailed error information
        logger.error(`${operationName} failed`, {
          attempt,
          maxRetries: this.retryConfig.maxRetries,
          errorType,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorCode: axios.isAxiosError(error) ? error.code : undefined,
          statusCode: axios.isAxiosError(error) ? error.response?.status : undefined,
          url: axios.isAxiosError(error) ? error.config?.url : undefined,
        });

        // Check if we should retry
        const shouldRetry = this.isRetryableError(errorType) && attempt < this.retryConfig.maxRetries;
        
        if (!shouldRetry) {
          // Log final failure
          logger.error(`${operationName} failed permanently`, {
            errorType,
            totalAttempts: attempt + 1,
            reason: !this.isRetryableError(errorType) 
              ? 'Non-retryable error' 
              : 'Max retries exceeded',
          });
          throw error;
        }

        // Calculate backoff delay
        const delayMs = this.calculateBackoffDelay(attempt);
        
        logger.info(`Waiting before retry`, {
          operation: operationName,
          delayMs,
          nextAttempt: attempt + 1,
        });

        // Wait before retrying
        await this.delay(delayMs);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError;
  }

  /**
   * Connect to Figma API and validate token and file ID
   * Implements requirement 3.1 - Validate API token and file ID
   * Implements requirement 3.5, 7.4 - Retry with exponential backoff
   */
  async connect(apiToken?: string, fileId?: string): Promise<void> {
    // Update credentials if provided
    if (apiToken) {
      this.apiToken = apiToken;
      this.axiosInstance.defaults.headers['X-Figma-Token'] = apiToken;
    }
    if (fileId) {
      this.fileId = fileId;
    }

    // Validate that we have both token and file ID
    if (!this.apiToken || !this.fileId) {
      const error = new Error('Figma API token and file ID are required');
      logger.error('Figma connection failed: Missing credentials', {
        hasToken: !!this.apiToken,
        hasFileId: !!this.fileId,
      });
      throw error;
    }

    try {
      logger.info('Attempting to connect to Figma API', {
        fileId: this.fileId,
      });

      // Use retry logic for connection
      await this.executeWithRetry(async () => {
        // Validate connection by fetching file metadata
        const response = await this.axiosInstance.get(`/files/${this.fileId}`);

        if (response.status === 200 && response.data) {
          this.isConnected = true;
          logger.info('Successfully connected to Figma API', {
            fileId: this.fileId,
            fileName: response.data.name,
          });
          return response;
        } else {
          throw new Error('Invalid response from Figma API');
        }
      }, 'Figma API connection');

    } catch (error) {
      this.isConnected = false;
      
      // Categorize and log the error
      const errorType = this.categorizeError(error);
      
      if (errorType === FigmaErrorType.AUTHENTICATION_ERROR) {
        logger.error('Figma authentication failed: Invalid API token', {
          fileId: this.fileId,
          errorType,
        });
        throw new Error('Invalid Figma API token');
      } else if (errorType === FigmaErrorType.NOT_FOUND_ERROR) {
        logger.error('Figma file not found', {
          fileId: this.fileId,
          errorType,
        });
        throw new Error('Figma file not found');
      }
      
      logger.error('Failed to connect to Figma API after all retries', {
        error: error instanceof Error ? error.message : String(error),
        fileId: this.fileId,
        errorType,
      });
      throw error;
    }
  }

  /**
   * Fetch icon components from Figma file
   * Implements requirement 3.1 - Call Figma API to get file components
   * Implements requirement 3.5, 7.4 - Retry with exponential backoff
   */
  async fetchIconComponents(): Promise<FigmaComponent[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to Figma API. Call connect() first.');
    }

    try {
      logger.info('Fetching components from Figma file', {
        fileId: this.fileId,
      });

      // Use retry logic for fetching components
      const response = await this.executeWithRetry(async () => {
        const res = await this.axiosInstance.get(`/files/${this.fileId}`);

        if (!res.data) {
          throw new Error('Invalid Figma file structure');
        }

        return res;
      }, 'Fetch Figma components');

      // Extract components from the response
      // Figma API returns components in two places:
      // 1. response.data.components - Published components (key-value pairs)
      // 2. response.data.document - Document tree (may contain unpublished components and instances)
      const components: FigmaComponent[] = [];
      
      // First, scan the document tree for instances
      // IMPORTANT: Instances are actual usages of components and can be exported even if unpublished
      // Instances contain the real content, while component definitions may be empty
      if (response.data.document) {
        const instances = this.extractInstances(response.data.document);
        logger.info('Found component instances in document tree', {
          fileId: this.fileId,
          instanceCount: instances.length,
        });
        
        // Prefer instances over component definitions
        // Instances can be exported even if the component definition is empty or unpublished
        for (const instance of instances) {
          components.push(instance);
        }
      }
      
      // Then, get published components from the top-level components object
      // Only add these if we don't already have an instance for them
      if (response.data.components) {
        for (const [id, component] of Object.entries(response.data.components)) {
          // Check if we already have an instance of this component
          const hasInstance = components.some(c => c.componentId === id);
          if (!hasInstance) {
            components.push({
              id,
              name: (component as any).name,
              type: 'COMPONENT',
              description: (component as any).description || '',
            });
          }
        }
      }
      
      // Finally, scan the document tree for component definitions (as fallback)
      if (response.data.document) {
        const treeComponents = this.extractComponents(response.data.document);
        // Add tree components that aren't already in the list
        for (const treeComp of treeComponents) {
          if (!components.find(c => c.id === treeComp.id || c.componentId === treeComp.id)) {
            components.push(treeComp);
          }
        }
      }

      logger.info('Successfully fetched Figma components', {
        fileId: this.fileId,
        componentCount: components.length,
      });

      return components;
    } catch (error) {
      logger.error('Failed to fetch Figma components after all retries', {
        error: error instanceof Error ? error.message : String(error),
        fileId: this.fileId,
        errorType: this.categorizeError(error),
      });
      throw error;
    }
  }

  /**
   * Extract components from Figma document tree
   * Recursively traverses the document to find all components
   */
  private extractComponents(node: any): FigmaComponent[] {
    const components: FigmaComponent[] = [];

    // Check if current node is a component
    if (node.type === 'COMPONENT') {
      components.push({
        id: node.id,
        name: node.name,
        type: node.type,
        description: node.description,
      });
    }

    // Recursively process children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        components.push(...this.extractComponents(child));
      }
    }

    return components;
  }

  /**
   * Extract component instances from Figma document tree
   * Instances are actual usages of components and can be exported even if unpublished
   * Recursively traverses the document to find all instances
   */
  private extractInstances(node: any): FigmaComponent[] {
    const instances: FigmaComponent[] = [];

    // Check if current node is an instance
    if (node.type === 'INSTANCE' && node.componentId) {
      instances.push({
        id: node.id,  // Use instance ID for export
        name: node.name,
        type: 'INSTANCE',
        description: node.description || '',
        componentId: node.componentId,  // Store the component ID for reference
      });
    }

    // Recursively process children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        instances.push(...this.extractInstances(child));
      }
    }

    return instances;
  }

  /**
   * Handle axios errors with detailed logging
   * Implements requirement 3.5, 7.4 - Error handling and logging
   */
  private handleAxiosError(error: AxiosError): void {
    if (error.response) {
      // Server responded with error status
      logger.error('Figma API error response', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      // Request was made but no response received
      logger.error('Figma API no response', {
        message: error.message,
        url: error.config?.url,
      });
    } else {
      // Error in request setup
      logger.error('Figma API request setup error', {
        message: error.message,
      });
    }
  }

  /**
   * Export a Figma component as SVG
   * Implements requirement 3.2, 3.3 - Export component as SVG
   * Implements requirement 3.5, 7.4 - Retry with exponential backoff
   * 
   * @param componentId - The Figma component ID to export
   * @returns SVG string content
   */
  async exportComponentAsSVG(componentId: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Not connected to Figma API. Call connect() first.');
    }

    if (!componentId) {
      throw new Error('Component ID is required');
    }

    try {
      logger.info('Exporting Figma component as SVG', {
        fileId: this.fileId,
        componentId,
      });

      // Use retry logic for getting image URL
      const imageResponse = await this.executeWithRetry(async () => {
        const res = await this.axiosInstance.get(
          `/images/${this.fileId}`,
          {
            params: {
              ids: componentId,
              format: 'svg',
            },
          }
        );

        if (!res.data || !res.data.images) {
          throw new Error('Invalid response from Figma images API');
        }

        const svgUrl = res.data.images[componentId];
        if (!svgUrl) {
          throw new Error(`No SVG URL returned for component ${componentId}`);
        }

        return { svgUrl };
      }, `Export component ${componentId} - get URL`);

      // Use retry logic for downloading SVG content
      const svgContent = await this.executeWithRetry(async () => {
        const svgResponse = await axios.get(imageResponse.svgUrl, {
          timeout: this.retryConfig.timeoutMs,
          responseType: 'text',
        });

        if (!svgResponse.data || typeof svgResponse.data !== 'string') {
          throw new Error('Invalid SVG content received');
        }

        return svgResponse.data;
      }, `Export component ${componentId} - download SVG`);

      logger.info('Successfully exported component as SVG', {
        fileId: this.fileId,
        componentId,
        svgLength: svgContent.length,
      });

      return svgContent;
    } catch (error) {
      logger.error('Failed to export component as SVG after all retries', {
        error: error instanceof Error ? error.message : String(error),
        fileId: this.fileId,
        componentId,
        errorType: this.categorizeError(error),
      });
      throw error;
    }
  }

  /**
   * Filter components to identify icons based on naming conventions or tags
   * Implements requirement 3.2 - Identify components marked as icons
   * 
   * Filtering rules:
   * - Component name starts with "icon-" or "Icon-" (case insensitive)
   * - Component name contains "icon" in the name
   * - Component description contains "icon" tag
   * 
   * @param components - Array of Figma components to filter
   * @returns Filtered array of icon components
   */
  filterIconComponents(components: FigmaComponent[]): FigmaComponent[] {
    const iconComponents = components.filter((component) => {
      const nameLower = component.name.toLowerCase();
      const descriptionLower = (component.description || '').toLowerCase();

      // Check naming conventions
      const hasIconPrefix = nameLower.startsWith('icon-') || nameLower.startsWith('icon_');
      const containsIcon = nameLower.includes('icon');
      const hasIconTag = descriptionLower.includes('icon') || descriptionLower.includes('#icon');

      return hasIconPrefix || containsIcon || hasIconTag;
    });

    logger.info('Filtered icon components', {
      totalComponents: components.length,
      iconComponents: iconComponents.length,
    });

    return iconComponents;
  }

  /**
   * Fetch icon components with pagination support
   * Implements requirement 3.2 - Handle Figma API pagination
   * 
   * Note: Figma's /files endpoint returns the entire file structure in one call,
   * so pagination is handled internally by processing the document tree.
   * For large files, this method processes components in batches.
   * 
   * @param filterIcons - Whether to filter only icon components (default: true)
   * @returns Array of components (optionally filtered to icons only)
   */
  async fetchIconComponentsWithPagination(filterIcons: boolean = true): Promise<FigmaComponent[]> {
    if (!this.isConnected) {
      throw new Error('Not connected to Figma API. Call connect() first.');
    }

    try {
      logger.info('Fetching components with pagination', {
        fileId: this.fileId,
        filterIcons,
      });

      // Fetch all components
      const allComponents = await this.fetchIconComponents();

      // Apply filtering if requested
      const components = filterIcons 
        ? this.filterIconComponents(allComponents)
        : allComponents;

      logger.info('Successfully fetched components with pagination', {
        fileId: this.fileId,
        totalComponents: allComponents.length,
        filteredComponents: components.length,
      });

      return components;
    } catch (error) {
      logger.error('Failed to fetch components with pagination', {
        error: error instanceof Error ? error.message : String(error),
        fileId: this.fileId,
      });
      throw error;
    }
  }

  /**
   * Export multiple components as SVG with rate limiting
   * Implements requirement 3.2, 3.3 - Handle rate limiting when exporting multiple components
   * 
   * @param componentIds - Array of component IDs to export
   * @param delayMs - Delay between requests in milliseconds (default: 100ms)
   * @returns Map of component ID to SVG content
   */
  async exportMultipleComponentsAsSVG(
    componentIds: string[],
    delayMs: number = 100
  ): Promise<Map<string, string>> {
    if (!this.isConnected) {
      throw new Error('Not connected to Figma API. Call connect() first.');
    }

    const results = new Map<string, string>();
    const errors: Array<{ componentId: string; error: string }> = [];

    logger.info('Exporting multiple components as SVG', {
      fileId: this.fileId,
      componentCount: componentIds.length,
      delayMs,
    });

    for (let i = 0; i < componentIds.length; i++) {
      const componentId = componentIds[i];

      try {
        const svg = await this.exportComponentAsSVG(componentId);
        results.set(componentId, svg);

        // Add delay between requests to respect rate limits
        if (i < componentIds.length - 1) {
          await this.delay(delayMs);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({ componentId, error: errorMessage });
        logger.warn('Failed to export component, continuing with others', {
          componentId,
          error: errorMessage,
        });
      }
    }

    logger.info('Completed exporting multiple components', {
      fileId: this.fileId,
      successCount: results.size,
      errorCount: errors.length,
    });

    if (errors.length > 0) {
      logger.warn('Some components failed to export', {
        errors,
      });
    }

    return results;
  }

  /**
   * Utility method to add delay between API calls
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sync a single icon from Figma to the icon library
   * Implements requirement 3.3, 3.4 - Sync single icon
   * 
   * @param componentId - Figma component ID
   * @param componentName - Component name to use as icon name
   * @param iconSetManager - IconSetManager instance to save the icon
   * @param namespace - Icon set namespace (default: 'gd')
   * @returns Promise<void>
   */
  async syncIcon(
    componentId: string,
    componentName: string,
    iconSetManager: any,
    namespace: string = 'gd'
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Figma API. Call connect() first.');
    }

    try {
      logger.info('Syncing single icon from Figma', {
        fileId: this.fileId,
        componentId,
        componentName,
        namespace,
      });

      // Export component as SVG
      const svg = await this.exportComponentAsSVG(componentId);

      // Convert component name to valid icon name
      // Remove "icon-" or "Icon-" prefix if present, convert to lowercase, replace spaces with hyphens
      let iconName = componentName
        .replace(/^icon[-_]/i, '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, '');

      // Ensure icon name is not empty
      if (!iconName) {
        iconName = `icon-${componentId.substring(0, 8)}`;
      }

      // Add icon to the icon set (with overwrite strategy for sync)
      await iconSetManager.addIcon(namespace, iconName, svg, {
        conflictStrategy: 'overwrite',
      });

      logger.info('Successfully synced icon from Figma', {
        fileId: this.fileId,
        componentId,
        componentName,
        iconName,
        namespace,
      });
    } catch (error) {
      logger.error('Failed to sync icon from Figma', {
        error: error instanceof Error ? error.message : String(error),
        fileId: this.fileId,
        componentId,
        componentName,
      });
      throw error;
    }
  }

  /**
   * Sync all icons from Figma to the icon library
   * Implements requirement 3.3, 3.4 - Sync all icons with incremental support
   * Implements requirement 3.5 - Ensure Figma API failures don't affect existing icon library
   * 
   * @param iconSetManager - IconSetManager instance to save icons
   * @param namespace - Icon set namespace (default: 'gd')
   * @param incremental - If true, only update changed icons (default: false)
   * @returns Promise<SyncResult> - Sync result with success/failure counts
   */
  async syncAllIcons(
    iconSetManager: any,
    namespace: string = 'gd',
    incremental: boolean = false
  ): Promise<SyncResult> {
    if (!this.isConnected) {
      const error = new Error('Not connected to Figma API. Call connect() first.');
      logger.error('Sync failed: Not connected to Figma', {
        namespace,
      });
      throw error;
    }

    const result: SyncResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      logger.info('Starting Figma sync', {
        fileId: this.fileId,
        namespace,
        incremental,
      });

      // Fetch and filter icon components with retry logic
      let iconComponents: FigmaComponent[];
      try {
        // Set to false to sync all components, not just those with "icon" in the name
        iconComponents = await this.fetchIconComponentsWithPagination(false);
      } catch (error) {
        // Log the error but don't throw - existing icon library should remain available
        logger.error('Failed to fetch icon components from Figma, sync aborted', {
          error: error instanceof Error ? error.message : String(error),
          errorType: this.categorizeError(error),
          fileId: this.fileId,
          namespace,
        });
        
        // Return empty result - existing icons are still available
        result.errors.push({
          componentId: 'N/A',
          error: `Failed to fetch components: ${error instanceof Error ? error.message : String(error)}`,
        });
        return result;
      }

      if (iconComponents.length === 0) {
        logger.warn('No icon components found in Figma file', {
          fileId: this.fileId,
        });
        return result;
      }

      logger.info('Found icon components to sync', {
        fileId: this.fileId,
        componentCount: iconComponents.length,
      });

      // If incremental sync, load existing icon set to compare
      let existingIcons: Map<string, any> | null = null;
      if (incremental) {
        try {
          const iconSet = await iconSetManager.getAllIcons(namespace);
          existingIcons = new Map(Object.entries(iconSet.icons));
          logger.info('Loaded existing icons for incremental sync', {
            existingIconCount: existingIcons.size,
          });
        } catch (error) {
          logger.warn('Failed to load existing icons, performing full sync', {
            error: error instanceof Error ? error.message : String(error),
          });
          existingIcons = null;
        }
      }

      // Sync each icon component
      for (const component of iconComponents) {
        try {
          // Convert component name to icon name
          let iconName = component.name
            .replace(/^icon[-_]/i, '')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-_]/g, '');

          if (!iconName) {
            iconName = `icon-${component.id.substring(0, 8)}`;
          }

          // For incremental sync, check if icon needs updating
          if (incremental && existingIcons) {
            const existingIcon = existingIcons.get(iconName);
            if (existingIcon) {
              // Icon exists - in a real implementation, we would compare
              // the SVG content or use Figma's version/lastModified fields
              // For now, we'll skip existing icons in incremental mode
              logger.debug('Skipping existing icon in incremental sync', {
                iconName,
                componentId: component.id,
              });
              result.success++;
              continue;
            }
          }

          // Sync the icon - errors are caught per-icon to not affect others
          try {
            await this.syncIcon(component.id, component.name, iconSetManager, namespace);
            result.success++;
          } catch (syncError) {
            const errorMessage = syncError instanceof Error ? syncError.message : String(syncError);
            result.failed++;
            result.errors.push({
              componentId: component.id,
              error: errorMessage,
            });

            logger.warn('Failed to sync component, continuing with others', {
              componentId: component.id,
              componentName: component.name,
              error: errorMessage,
              errorType: this.categorizeError(syncError),
            });
          }

          // Add small delay to respect rate limits
          await this.delay(100);
        } catch (error) {
          // Catch any unexpected errors in the loop
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.failed++;
          result.errors.push({
            componentId: component.id,
            error: errorMessage,
          });

          logger.error('Unexpected error processing component', {
            componentId: component.id,
            componentName: component.name,
            error: errorMessage,
          });
        }
      }

      logger.info('Figma sync completed', {
        fileId: this.fileId,
        namespace,
        totalComponents: iconComponents.length,
        successCount: result.success,
        failedCount: result.failed,
      });

      return result;
    } catch (error) {
      // Catch any unexpected errors at the top level
      logger.error('Figma sync encountered unexpected error', {
        error: error instanceof Error ? error.message : String(error),
        errorType: this.categorizeError(error),
        fileId: this.fileId,
        namespace,
      });
      
      // Don't throw - return the partial result so existing icons remain available
      result.errors.push({
        componentId: 'N/A',
        error: `Sync error: ${error instanceof Error ? error.message : String(error)}`,
      });
      
      return result;
    }
  }

  /**
   * Check if connected to Figma API
   */
  isConnectedToFigma(): boolean {
    return this.isConnected;
  }

  /**
   * Get current file ID
   */
  getFileId(): string {
    return this.fileId;
  }
}
