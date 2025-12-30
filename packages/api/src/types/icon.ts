/**
 * Iconify icon data structure
 */
export interface IconData {
  body: string;           // SVG path data
  width?: number;         // Icon width
  height?: number;        // Icon height
  left?: number;          // Left offset
  top?: number;           // Top offset
  rotate?: number;        // Rotation angle
  hFlip?: boolean;        // Horizontal flip
  vFlip?: boolean;        // Vertical flip
}

/**
 * SVG metadata extracted from SVG file
 */
export interface SVGMetadata {
  viewBox?: string;
  width?: string;
  height?: string;
  hasValidPath: boolean;
}

/**
 * Icon set structure
 */
export interface IconSet {
  prefix: string;         // Namespace, fixed as "gd"
  icons: {
    [name: string]: IconData;
  };
  width?: number;         // Default width
  height?: number;        // Default height
  lastModified?: number;  // Last modified timestamp
}

/**
 * Icon set metadata
 */
export interface IconSetMetadata {
  prefix: string;
  name: string;
  total: number;          // Total number of icons
  version: string;        // Version number
  author?: string;
  license?: string;
  lastModified: number;
}

/**
 * Icon version information
 */
export interface Version {
  id: string;             // Version ID (e.g., "v1234567890")
  timestamp: number;      // Creation timestamp
  data: IconData;         // Icon data
  author?: string;        // Modifier
  comment?: string;       // Version description
}

/**
 * Figma component information
 */
export interface FigmaComponent {
  id: string;
  name: string;
  type: string;
  description?: string;
  componentId?: string;  // For instances, stores the component ID they reference
}

/**
 * Figma sync result
 */
export interface SyncResult {
  success: number;        // Number of successful syncs
  failed: number;         // Number of failed syncs
  errors: Array<{
    componentId: string;
    error: string;
  }>;
}
