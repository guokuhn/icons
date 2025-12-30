import React from 'react';

export interface IconInfo {
  name: string;
  body: string;
  width?: number;
  height?: number;
}

export interface DirectSvgIconProps {
  icon: IconInfo;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  removeColors?: boolean;
}

/**
 * Simple icon component that renders SVG directly from data
 */
export function DirectSvgIcon({ 
  icon, 
  width = 48, 
  height = 48, 
  style = {},
  removeColors = false 
}: DirectSvgIconProps) {
  // Optionally remove hardcoded fill colors and replace with currentColor
  let body = icon.body;
  
  if (removeColors) {
    // Check if this is a stroke-based icon (has stroke attribute but fill="none")
    const isStrokeBased = body.includes('stroke=') && body.includes('fill="none"');
    
    if (isStrokeBased) {
      // For stroke-based icons: only replace stroke colors, keep fill="none"
      body = body.replace(/stroke="[^"]*"/g, 'stroke="currentColor"');
    } else {
      // For fill-based icons: replace fill colors
      body = body.replace(/fill="[^"]*"/g, 'fill="currentColor"');
      body = body.replace(/stroke="[^"]*"/g, 'stroke="currentColor"');
      
      // Add fill="currentColor" to elements that don't have fill attribute
      // (only for fill-based icons)
      body = body.replace(/<(path|circle|rect|polygon|ellipse|line|polyline)(?![^>]*fill=)/g, '<$1 fill="currentColor"');
    }
  }
  
  // Extract color from style to apply to SVG
  const color = style.color || 'currentColor';
  const { color: _, ...restStyle } = style;
  
  return (
    <div 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        display: 'inline-block',
        lineHeight: 0,
        color: color, // Apply color to container so SVG can inherit
        ...restStyle
      }}
      dangerouslySetInnerHTML={{ 
        __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${icon.width || 24} ${icon.height || 24}" width="${width}" height="${height}" style="display: block; color: inherit;">${body}</svg>` 
      }}
    />
  );
}

export default DirectSvgIcon;

