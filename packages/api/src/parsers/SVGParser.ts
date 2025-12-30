import { optimize } from 'svgo';
import type { IconData, SVGMetadata } from '../types/icon.js';
import logger from '../utils/logger.js';
import { SVGParseError } from '../types/errors.js';

/**
 * SVGParser class for parsing and converting SVG files to Iconify format
 * Implements requirements 1.1 and 1.3
 */
export class SVGParser {
  /**
   * Parse SVG string and convert to Iconify IconData format
   * Extracts viewBox, width, height, and path data
   * 
   * @param svgContent - Raw SVG string
   * @returns Promise<IconData> - Parsed icon data in Iconify format
   * @throws Error if SVG is invalid or cannot be parsed
   */
  async parseSVG(svgContent: string): Promise<IconData> {
    // Validate SVG first
    if (!this.validateSVG(svgContent)) {
      const error = new SVGParseError('Invalid SVG format', {
        reason: 'SVG validation failed',
      });
      logger.error(`SVG parsing failed: ${error.message}`, {
        code: error.code,
        details: error.details,
      });
      throw error;
    }

    try {
      // Optimize SVG first
      const optimizedSVG = await this.optimizeSVG(svgContent);
      
      // Extract metadata
      const metadata = this.extractMetadata(optimizedSVG);
      
      if (!metadata.hasValidPath) {
        const error = new SVGParseError('SVG does not contain valid path data', {
          reason: 'No valid SVG elements (path, circle, rect, etc.) found',
        });
        logger.error(`SVG parsing failed: ${error.message}`, {
          code: error.code,
          details: error.details,
        });
        throw error;
      }

      // Parse dimensions from viewBox or width/height attributes
      let width: number | undefined;
      let height: number | undefined;
      
      if (metadata.viewBox) {
        const viewBoxParts = metadata.viewBox.split(/\s+/);
        if (viewBoxParts.length === 4) {
          width = parseFloat(viewBoxParts[2]);
          height = parseFloat(viewBoxParts[3]);
        }
      }
      
      // Fallback to width/height attributes if viewBox not available
      if (!width && metadata.width) {
        const widthNum = parseFloat(metadata.width.replace(/[^0-9.]/g, ''));
        if (!isNaN(widthNum)) {
          width = widthNum;
        }
      }
      if (!height && metadata.height) {
        const heightNum = parseFloat(metadata.height.replace(/[^0-9.]/g, ''));
        if (!isNaN(heightNum)) {
          height = heightNum;
        }
      }

      // Extract the body (inner SVG content without the <svg> wrapper)
      const body = this.extractBody(optimizedSVG);

      const iconData: IconData = {
        body,
      };

      // Add optional dimensions if available
      if (width && !isNaN(width)) {
        iconData.width = width;
      }
      if (height && !isNaN(height)) {
        iconData.height = height;
      }

      logger.debug('SVG parsed successfully', {
        hasWidth: !!iconData.width,
        hasHeight: !!iconData.height,
        bodyLength: body.length,
      });

      return iconData;
    } catch (error) {
      if (error instanceof SVGParseError) {
        throw error;
      }
      const parseError = new SVGParseError(
        `Failed to parse SVG: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
      logger.error(`SVG parsing failed: ${parseError.message}`, {
        code: parseError.code,
        details: parseError.details,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw parseError;
    }
  }

  /**
   * Validate SVG format
   * Checks if the input is valid XML and contains SVG elements
   * 
   * @param svgContent - Raw SVG string
   * @returns boolean - true if valid, false otherwise
   */
  validateSVG(svgContent: string): boolean {
    if (!svgContent || typeof svgContent !== 'string') {
      return false;
    }

    // Trim whitespace
    const trimmed = svgContent.trim();
    
    if (trimmed.length === 0) {
      return false;
    }

    // Check if it looks like XML/SVG
    if (!trimmed.startsWith('<')) {
      return false;
    }

    // Check for SVG tag
    if (!trimmed.includes('<svg')) {
      return false;
    }

    // Basic XML validation - check for balanced tags
    try {
      // Simple check: count opening and closing svg tags
      const openingSvgCount = (trimmed.match(/<svg[\s>]/g) || []).length;
      const closingSvgCount = (trimmed.match(/<\/svg>/g) || []).length;
      
      if (openingSvgCount === 0 || openingSvgCount !== closingSvgCount) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Optimize SVG by cleaning up and simplifying the code
   * Removes unnecessary attributes, optimizes paths, etc.
   * 
   * @param svgContent - Raw SVG string
   * @returns Promise<string> - Optimized SVG string
   */
  async optimizeSVG(svgContent: string): Promise<string> {
    try {
      // For stroke-based icons, we need to preserve fill="none"
      // SVGO tends to remove it, which breaks rendering in Iconify
      // So we'll skip optimization for SVGs that contain stroke attributes
      const hasStroke = svgContent.includes('stroke=');
      
      if (hasStroke) {
        // Don't optimize stroke-based icons - return original
        logger.debug('Skipping SVGO optimization for stroke-based icon');
        
        // Auto-fix: Add fill="none" to path elements that have stroke but no fill
        // This ensures proper rendering in Iconify
        let fixedContent = svgContent;
        
        // Find all <path> tags that have stroke but don't have fill attribute
        fixedContent = fixedContent.replace(
          /<path\s+([^>]*stroke[^>]*?)>/gi,
          (match, attrs) => {
            // Check if this path already has a fill attribute
            if (/fill\s*=/.test(attrs)) {
              return match; // Already has fill, don't modify
            }
            // Add fill="none" at the beginning of attributes
            return `<path fill="none" ${attrs}>`;
          }
        );
        
        // Also handle other shape elements (circle, rect, ellipse, polygon, polyline, line)
        const shapeElements = ['circle', 'rect', 'ellipse', 'polygon', 'polyline', 'line'];
        for (const element of shapeElements) {
          const regex = new RegExp(`<${element}\\s+([^>]*stroke[^>]*?)>`, 'gi');
          fixedContent = fixedContent.replace(regex, (match, attrs) => {
            if (/fill\s*=/.test(attrs)) {
              return match;
            }
            return `<${element} fill="none" ${attrs}>`;
          });
        }
        
        if (fixedContent !== svgContent) {
          logger.debug('Auto-fixed stroke-based icon: added fill="none" to elements');
        }
        
        // Replace hardcoded stroke colors with currentColor
        // This allows the icon to inherit color from CSS
        fixedContent = this.replaceColorsWithCurrentColor(fixedContent);
        
        return fixedContent;
      }
      
      // Use svgo directly for optimization (fill-based icons only)
      const result = optimize(svgContent, {
        multipass: true,
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                // Don't remove fill="none" - it's important for stroke-based icons
                removeUselessStrokeAndFill: false,
                // Don't merge styles that might affect fill/stroke
                mergeStyles: false,
              },
            },
          },
        ],
      });
      
      // Replace hardcoded colors with currentColor for fill-based icons too
      return this.replaceColorsWithCurrentColor(result.data);
    } catch (error) {
      // If optimization fails, return original
      // This ensures we don't break valid SVGs
      logger.warn('SVG optimization failed, using original', {
        error: error instanceof Error ? error.message : String(error),
      });
      return svgContent;
    }
  }

  /**
   * Extract metadata from SVG
   * Gets viewBox, width, height, and checks for valid path data
   * 
   * @param svgContent - Raw SVG string
   * @returns SVGMetadata - Extracted metadata
   */
  extractMetadata(svgContent: string): SVGMetadata {
    const metadata: SVGMetadata = {
      hasValidPath: false,
    };

    try {
      // Extract viewBox
      const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/);
      if (viewBoxMatch) {
        metadata.viewBox = viewBoxMatch[1];
      }

      // Extract width
      const widthMatch = svgContent.match(/width=["']([^"']+)["']/);
      if (widthMatch) {
        metadata.width = widthMatch[1];
      }

      // Extract height
      const heightMatch = svgContent.match(/height=["']([^"']+)["']/);
      if (heightMatch) {
        metadata.height = heightMatch[1];
      }

      // Check for valid path data (path, circle, rect, polygon, polyline, line, ellipse)
      const hasPath = /<path[\s>]/.test(svgContent);
      const hasCircle = /<circle[\s>]/.test(svgContent);
      const hasRect = /<rect[\s>]/.test(svgContent);
      const hasPolygon = /<polygon[\s>]/.test(svgContent);
      const hasPolyline = /<polyline[\s>]/.test(svgContent);
      const hasLine = /<line[\s>]/.test(svgContent);
      const hasEllipse = /<ellipse[\s>]/.test(svgContent);

      metadata.hasValidPath = hasPath || hasCircle || hasRect || hasPolygon || 
                              hasPolyline || hasLine || hasEllipse;

      return metadata;
    } catch (error) {
      return metadata;
    }
  }

  /**
   * Extract the body (inner content) from SVG
   * Removes the <svg> wrapper and returns only the inner elements
   * 
   * @param svgContent - Raw SVG string
   * @returns string - SVG body content
   */
  private extractBody(svgContent: string): string {
    try {
      // Find the opening svg tag and its closing tag
      const svgOpenMatch = svgContent.match(/<svg[^>]*>/);
      const svgCloseMatch = svgContent.match(/<\/svg>/);

      if (!svgOpenMatch || !svgCloseMatch) {
        throw new Error('Could not find SVG tags');
      }

      const openTagEnd = svgContent.indexOf(svgOpenMatch[0]) + svgOpenMatch[0].length;
      const closeTagStart = svgContent.lastIndexOf('</svg>');

      // Extract content between opening and closing tags
      const body = svgContent.substring(openTagEnd, closeTagStart).trim();

      return body;
    } catch (error) {
      throw new Error(`Failed to extract SVG body: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Replace hardcoded colors with currentColor
   * This allows the icon to inherit color from CSS
   * 
   * @param svgContent - SVG string with potential hardcoded colors
   * @returns string - SVG with colors replaced by currentColor
   */
  private replaceColorsWithCurrentColor(svgContent: string): string {
    let result = svgContent;
    
    // Replace stroke colors (but not stroke-width, stroke-linecap, etc.)
    // Match stroke="..." where value is not "none" or "currentColor"
    result = result.replace(
      /stroke="(?!none|currentColor)([^"]*)"/gi,
      'stroke="currentColor"'
    );
    
    // Replace fill colors (but not fill="none")
    // Match fill="..." where value is not "none" or "currentColor"  
    result = result.replace(
      /fill="(?!none|currentColor)([^"]*)"/gi,
      'fill="currentColor"'
    );
    
    if (result !== svgContent) {
      logger.debug('Replaced hardcoded colors with currentColor');
    }
    
    return result;
  }
}
