import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import { IconSetManager } from './managers/IconSetManager.js';
import { CacheManager } from './cache/CacheManager.js';
import { IconSet } from './types/icon.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler.js';
import { authenticateApiKey } from './middleware/auth.js';
import { readRateLimiter, writeRateLimiter } from './middleware/rateLimiter.js';
import { ValidationError, NotFoundError, PayloadTooLargeError } from './types/errors.js';
import { FigmaIntegrator } from './integrations/FigmaIntegrator.js';
import { CorsConfigManager } from './middleware/corsConfig.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize managers
const iconSetManager = new IconSetManager();
const cacheManager = new CacheManager();

// Initialize and configure CORS
const corsConfigManager = new CorsConfigManager();
const corsConfig = corsConfigManager.initializeFromEnv(process.env.CORS_ORIGIN);
const corsMiddleware = cors(corsConfigManager.getCorsMiddlewareConfig(corsConfig));

// Validate and log Figma configuration at startup
function validateFigmaConfiguration(): { enabled: boolean; valid: boolean; message: string } {
  const figmaApiToken = process.env.FIGMA_API_TOKEN;
  const figmaFileId = process.env.FIGMA_FILE_ID;
  
  // Check if both credentials are provided
  const hasToken = figmaApiToken && figmaApiToken.trim().length > 0;
  const hasFileId = figmaFileId && figmaFileId.trim().length > 0;
  
  if (!hasToken && !hasFileId) {
    return {
      enabled: false,
      valid: true,
      message: 'Figma integration is disabled (no credentials configured)',
    };
  }
  
  if (!hasToken) {
    return {
      enabled: true,
      valid: false,
      message: 'Figma integration is partially configured: FIGMA_API_TOKEN is missing',
    };
  }
  
  if (!hasFileId) {
    return {
      enabled: true,
      valid: false,
      message: 'Figma integration is partially configured: FIGMA_FILE_ID is missing',
    };
  }
  
  // Both credentials are present
  return {
    enabled: true,
    valid: true,
    message: 'Figma integration is enabled and configured',
  };
}

// Validate Figma configuration at startup
const figmaConfig = validateFigmaConfiguration();
if (figmaConfig.enabled && figmaConfig.valid) {
  logger.info('Figma integration status: ENABLED', {
    figmaFileId: process.env.FIGMA_FILE_ID,
    hasToken: true,
  });
} else if (figmaConfig.enabled && !figmaConfig.valid) {
  logger.warn('Figma integration status: MISCONFIGURED', {
    message: figmaConfig.message,
    hasToken: !!(process.env.FIGMA_API_TOKEN && process.env.FIGMA_API_TOKEN.trim().length > 0),
    hasFileId: !!(process.env.FIGMA_FILE_ID && process.env.FIGMA_FILE_ID.trim().length > 0),
  });
} else {
  logger.info('Figma integration status: DISABLED', {
    message: figmaConfig.message,
  });
}

// Configure multer for file uploads
// Store files in memory for validation before saving
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024, // 1MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is SVG
    if (file.mimetype === 'image/svg+xml' || file.originalname.endsWith('.svg')) {
      cb(null, true);
    } else {
      cb(new ValidationError('Only SVG files are allowed'));
    }
  },
});

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Log all requests
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// GET /collections - Return list of icon sets
// Implements requirements 5.1
app.get('/collections', readRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  // For now, we only support the "gd" namespace
  const namespace = 'gd';
  
  // Try to get from cache first
  let iconSet = cacheManager.getCachedIconSet(namespace);
  
  if (!iconSet) {
    // Load from storage
    iconSet = await iconSetManager.loadIconSet(namespace);
    // Cache it
    cacheManager.cacheIconSet(namespace, iconSet);
  }
  
  // Get cache headers
  const cacheHeaders = cacheManager.getCacheHeaders(namespace);
  
  // Check for conditional request
  const clientETag = req.headers['if-none-match'];
  if (clientETag && clientETag === cacheHeaders['ETag']) {
    res.status(304).end();
    return;
  }
  
  // Build response according to Iconify API spec
  const response = {
    [namespace]: {
      name: namespace,
      total: Object.keys(iconSet.icons).length,
      version: iconSet.lastModified?.toString() || Date.now().toString(),
      author: 'GD Team',
    }
  };
  
  // Set cache headers
  res.set(cacheHeaders);
  res.json(response);
}));

// GET /collection?prefix=gd - Return complete icon set
// Implements requirements 5.2
app.get('/collection', readRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const prefix = req.query.prefix as string;
  
  if (!prefix) {
    throw new ValidationError('Missing required query parameter: prefix');
  }
  
  // Try to get from cache first
  let iconSet = cacheManager.getCachedIconSet(prefix);
  
  if (!iconSet) {
    // Load from storage
    iconSet = await iconSetManager.loadIconSet(prefix);
    // Cache it
    cacheManager.cacheIconSet(prefix, iconSet);
  }
  
  // Get cache headers
  const cacheHeaders = cacheManager.getCacheHeaders(prefix);
  
  // Check for conditional request
  const clientETag = req.headers['if-none-match'];
  if (clientETag && clientETag === cacheHeaders['ETag']) {
    res.status(304).end();
    return;
  }
  
  // Check if icon set exists (has icons)
  if (Object.keys(iconSet.icons).length === 0) {
    throw new NotFoundError(`Icon set with prefix "${prefix}" not found`);
  }
  
  // Set cache headers
  res.set(cacheHeaders);
  res.json(iconSet);
}));

// GET /icons?icons=gd:icon1,gd:icon2 - Return specified icons
// Implements requirements 5.3
app.get('/icons', readRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const iconsParam = req.query.icons as string;
  
  if (!iconsParam) {
    throw new ValidationError('Missing required query parameter: icons');
  }
  
  // Parse icon names (format: "gd:icon1,gd:icon2")
  const iconRequests = iconsParam.split(',').map(s => s.trim());
  
  // Group by namespace
  const iconsByNamespace: { [namespace: string]: string[] } = {};
  
  for (const iconRequest of iconRequests) {
    const parts = iconRequest.split(':');
    if (parts.length !== 2) {
      continue; // Skip invalid format
    }
    const [namespace, iconName] = parts;
    if (!iconsByNamespace[namespace]) {
      iconsByNamespace[namespace] = [];
    }
    iconsByNamespace[namespace].push(iconName);
  }
  
  // Load icon sets and extract requested icons
  const result: { [namespace: string]: IconSet } = {};
  
  for (const [namespace, iconNames] of Object.entries(iconsByNamespace)) {
    // Try to get from cache first
    let iconSet = cacheManager.getCachedIconSet(namespace);
    
    if (!iconSet) {
      // Load from storage
      iconSet = await iconSetManager.loadIconSet(namespace);
      // Cache it
      cacheManager.cacheIconSet(namespace, iconSet);
    }
    
    // Extract only requested icons
    const requestedIcons: { [name: string]: any } = {};
    for (const iconName of iconNames) {
      if (iconSet.icons[iconName]) {
        requestedIcons[iconName] = iconSet.icons[iconName];
      }
    }
    
    // Only include namespace if we found at least one icon
    if (Object.keys(requestedIcons).length > 0) {
      result[namespace] = {
        prefix: namespace,
        icons: requestedIcons,
        lastModified: iconSet.lastModified,
      };
    }
  }
  
  // Get cache headers (use first namespace for headers)
  const firstNamespace = Object.keys(iconsByNamespace)[0];
  const cacheHeaders = cacheManager.getCacheHeaders(firstNamespace);
  
  // Check for conditional request
  const clientETag = req.headers['if-none-match'];
  if (clientETag && clientETag === cacheHeaders['ETag']) {
    res.status(304).end();
    return;
  }
  
  // Check if we found any icons
  if (Object.keys(result).length === 0) {
    throw new NotFoundError('None of the requested icons were found');
  }
  
  // Set cache headers
  res.set(cacheHeaders);
  res.json(result);
}));

// GET /{namespace}.json?icons=icon1,icon2 - Iconify format endpoint
// Supports Iconify client library format: /gd.json?icons=home,logo,menu,search
app.get('/:namespace.json', readRateLimiter, asyncHandler(async (req: Request, res: Response) => {
  const namespace = req.params.namespace;
  const iconsParam = req.query.icons as string | undefined;
  
  // Try to get from cache first
  let iconSet = cacheManager.getCachedIconSet(namespace);
  
  if (!iconSet) {
    // Load from storage
    iconSet = await iconSetManager.loadIconSet(namespace);
    // Cache it
    cacheManager.cacheIconSet(namespace, iconSet);
  }
  
  // Get cache headers
  const cacheHeaders = cacheManager.getCacheHeaders(namespace);
  
  // Check for conditional request
  const clientETag = req.headers['if-none-match'];
  if (clientETag && clientETag === cacheHeaders['ETag']) {
    res.status(304).end();
    return;
  }
  
  // Check if icon set exists (has icons)
  if (Object.keys(iconSet.icons).length === 0) {
    throw new NotFoundError(`Icon set with prefix "${namespace}" not found`);
  }
  
  let response: IconSet;
  
  // If icons parameter is provided, filter to only those icons
  if (iconsParam) {
    const iconNames = iconsParam.split(',').map(s => s.trim());
    const requestedIcons: { [name: string]: any } = {};
    
    for (const iconName of iconNames) {
      if (iconSet.icons[iconName]) {
        requestedIcons[iconName] = iconSet.icons[iconName];
      }
    }
    
    // Only return if we found at least one icon
    if (Object.keys(requestedIcons).length === 0) {
      throw new NotFoundError('None of the requested icons were found');
    }
    
    response = {
      prefix: namespace,
      icons: requestedIcons,
      lastModified: iconSet.lastModified,
    };
  } else {
    // Return complete icon set
    response = iconSet;
  }
  
  // Set cache headers
  res.set(cacheHeaders);
  res.json(response);
}));

// POST /api/upload - Upload a new icon
// Implements requirements 2.1, 2.2, 2.3
app.post('/api/upload', writeRateLimiter, authenticateApiKey, upload.single('icon'), asyncHandler(async (req: Request, res: Response) => {
  // Check if file was uploaded
  if (!req.file) {
    throw new ValidationError('No file uploaded. Please provide an SVG file with the field name "icon"');
  }

  // Get icon name from request body or query
  const iconName = (req.body.name || req.query.name) as string;
  
  if (!iconName) {
    throw new ValidationError('Icon name is required. Provide it in the request body or query parameter "name"');
  }

  // Validate icon name format
  // Must be alphanumeric with hyphens and underscores, 1-50 characters
  const iconNameRegex = /^[a-zA-Z0-9_-]{1,50}$/;
  if (!iconNameRegex.test(iconName)) {
    throw new ValidationError(
      'Invalid icon name format. Name must contain only letters, numbers, hyphens, and underscores (1-50 characters)',
      { iconName, pattern: iconNameRegex.source }
    );
  }

  // Get namespace (default to "gd")
  const namespace = (req.body.namespace || req.query.namespace || 'gd') as string;

  // Get conflict strategy from request body or query (default to env or 'reject')
  const conflictStrategy = (req.body.conflictStrategy || req.query.conflictStrategy) as 'overwrite' | 'reject' | undefined;

  // Convert buffer to string
  const svgContent = req.file.buffer.toString('utf-8');

  // Validate that it's actually SVG content
  if (!svgContent.trim().startsWith('<svg') && !svgContent.trim().startsWith('<?xml')) {
    throw new ValidationError('Invalid SVG file. File must contain valid SVG content');
  }

  try {
    // Add icon using IconSetManager (this will parse and validate the SVG)
    await iconSetManager.addIcon(namespace, iconName, svgContent, { conflictStrategy });

    // Invalidate cache for this namespace
    cacheManager.invalidateCache(namespace);

    logger.info(`Icon uploaded successfully via API`, {
      namespace,
      iconName,
      fileSize: req.file.size,
      conflictStrategy,
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Icon uploaded successfully',
      data: {
        namespace,
        name: iconName,
        size: req.file.size,
      },
    });
  } catch (error) {
    // If it's an SVG parsing error, it will be caught by the error handler
    throw error;
  }
}));

// DELETE /api/icons/:namespace/:name - Delete an icon
// Implements requirement 2.5
app.delete('/api/icons/:namespace/:name', writeRateLimiter, authenticateApiKey, asyncHandler(async (req: Request, res: Response) => {
  const { namespace, name } = req.params;

  // Validate namespace and name
  if (!namespace || !name) {
    throw new ValidationError('Both namespace and icon name are required');
  }

  // Check if icon exists
  const existingIcon = await iconSetManager.getIcon(namespace, name);
  
  if (!existingIcon) {
    throw new NotFoundError(`Icon "${name}" not found in namespace "${namespace}"`);
  }

  // Delete the icon
  await iconSetManager.removeIcon(namespace, name);

  // Invalidate cache for this namespace
  cacheManager.invalidateCache(namespace);

  logger.info(`Icon deleted successfully via API`, {
    namespace,
    name,
  });

  // Return success response
  res.status(200).json({
    success: true,
    message: 'Icon deleted successfully',
    data: {
      namespace,
      name,
    },
  });
}));

// Handle multer errors (file too large, etc.)
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      next(new PayloadTooLargeError('File size exceeds the maximum limit of 1MB'));
    } else {
      next(new ValidationError(`File upload error: ${error.message}`));
    }
  } else {
    next(error);
  }
});

// POST /api/sync/figma - Sync icons from Figma
// Implements requirements 3.3, 3.4 - Figma sync with full/incremental support
app.post('/api/sync/figma', writeRateLimiter, authenticateApiKey, asyncHandler(async (req: Request, res: Response) => {
  // Get sync mode from query parameter (default to full sync)
  const syncMode = (req.query.mode || 'full') as string;
  
  // Validate sync mode
  if (syncMode !== 'full' && syncMode !== 'incremental') {
    throw new ValidationError('Invalid sync mode. Must be "full" or "incremental"');
  }
  
  const isIncremental = syncMode === 'incremental';
  
  // Get Figma credentials from environment
  const figmaApiToken = process.env.FIGMA_API_TOKEN;
  const figmaFileId = process.env.FIGMA_FILE_ID;
  
  // Check if Figma is configured
  if (!figmaApiToken || !figmaFileId) {
    logger.error('Figma sync requested but credentials not configured', {
      hasToken: !!figmaApiToken,
      hasFileId: !!figmaFileId,
    });
    throw new ValidationError('Figma integration is not configured. Please set FIGMA_API_TOKEN and FIGMA_FILE_ID environment variables');
  }
  
  // Get namespace (default to "gd")
  const namespace = (req.query.namespace || req.body.namespace || 'gd') as string;
  
  logger.info('Starting Figma sync via API', {
    syncMode,
    namespace,
    fileId: figmaFileId,
  });
  
  try {
    // Create Figma integrator instance
    const figmaIntegrator = new FigmaIntegrator(figmaApiToken, figmaFileId);
    
    // Connect to Figma API
    await figmaIntegrator.connect();
    
    // Sync all icons
    const syncResult = await figmaIntegrator.syncAllIcons(
      iconSetManager,
      namespace,
      isIncremental
    );
    
    // Invalidate cache for this namespace after successful sync
    if (syncResult.success > 0) {
      cacheManager.invalidateCache(namespace);
    }
    
    logger.info('Figma sync completed via API', {
      syncMode,
      namespace,
      successCount: syncResult.success,
      failedCount: syncResult.failed,
      errorCount: syncResult.errors.length,
    });
    
    // Return sync result
    res.status(200).json({
      success: true,
      message: `Figma sync completed (${syncMode} mode)`,
      data: {
        syncMode,
        namespace,
        successCount: syncResult.success,
        failedCount: syncResult.failed,
        totalProcessed: syncResult.success + syncResult.failed,
        errors: syncResult.errors,
      },
    });
  } catch (error) {
    // Log the error
    logger.error('Figma sync failed via API', {
      error: error instanceof Error ? error.message : String(error),
      syncMode,
      namespace,
    });
    
    // Re-throw to be handled by error handler
    throw error;
  }
}));

// Health check endpoint
// Implements requirement 7.5
app.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const startTime = process.uptime();
  const timestamp = Date.now();
  
  // Initialize health check results
  const checks: { [key: string]: string } = {};
  let overallStatus = 'healthy';
  
  // Check storage layer status
  try {
    // Try to read the base directory to verify storage is accessible
    const namespace = 'gd';
    await iconSetManager.loadIconSet(namespace);
    checks.storage = 'ok';
  } catch (error) {
    checks.storage = 'error';
    overallStatus = 'degraded';
    logger.warn('Health check: Storage layer check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Check cache status
  try {
    // Verify cache is operational by attempting to get a cached value
    const testNamespace = 'gd';
    const cachedValue = cacheManager.getCachedIconSet(testNamespace);
    // Cache is working if we can call the method without error
    checks.cache = 'ok';
  } catch (error) {
    checks.cache = 'error';
    overallStatus = 'degraded';
    logger.warn('Health check: Cache check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Check Figma connection status (if configured)
  const figmaApiToken = process.env.FIGMA_API_TOKEN;
  const figmaFileId = process.env.FIGMA_FILE_ID;
  
  if (figmaApiToken && figmaFileId) {
    try {
      // Create a Figma integrator instance and test connection
      const figmaIntegrator = new FigmaIntegrator(figmaApiToken, figmaFileId);
      await figmaIntegrator.connect();
      checks.figma = 'ok';
    } catch (error) {
      checks.figma = 'error';
      // Figma being down doesn't make the service unhealthy
      // since it's an optional integration
      logger.warn('Health check: Figma connection check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    checks.figma = 'not_configured';
  }
  
  // Collect system statistics
  const stats: { [key: string]: number } = {
    uptime: Math.floor(startTime),
  };
  
  // Get total icon count across all namespaces
  try {
    const namespace = 'gd';
    const iconSet = await iconSetManager.loadIconSet(namespace);
    stats.totalIcons = Object.keys(iconSet.icons).length;
  } catch (error) {
    stats.totalIcons = 0;
    logger.warn('Health check: Failed to count icons', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  // Build response
  const response = {
    status: overallStatus,
    timestamp,
    checks,
    stats,
  };
  
  // Return appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : 503;
  res.status(statusCode).json(response);
}));

// Clear cache endpoint (for development)
app.post('/api/cache/clear', asyncHandler(async (req: Request, res: Response) => {
  const namespace = req.query.namespace as string;
  
  if (namespace) {
    cacheManager.invalidateCache(namespace);
    logger.info(`Cache cleared for namespace: ${namespace}`);
    res.json({
      success: true,
      message: `Cache cleared for namespace: ${namespace}`,
    });
  } else {
    // Clear all caches
    cacheManager.invalidateCache('gd');
    cacheManager.invalidateCache('custom');
    logger.info('All caches cleared');
    res.json({
      success: true,
      message: 'All caches cleared',
    });
  }
}));

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Iconify API server running on port ${PORT}`, {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
    });
  });
}

export default app;
