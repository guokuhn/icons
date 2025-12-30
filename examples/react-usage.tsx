/**
 * React Icon Usage Examples
 * 
 * This file demonstrates various ways to use icons from the private Iconify library
 * in React applications.
 */

import { Icon } from '@iconify/react';

// ============================================================================
// Example 1: Basic Icon Usage
// ============================================================================

export function BasicIconExample() {
  return (
    <div>
      <Icon icon="gd:logo" />
      <Icon icon="gd:menu" />
      <Icon icon="gd:home" />
      <Icon icon="gd:search" />
    </div>
  );
}

// ============================================================================
// Example 2: Icons with Custom Sizes
// ============================================================================

export function IconSizesExample() {
  return (
    <div>
      {/* Using width and height props */}
      <Icon icon="gd:logo" width="16" height="16" />
      <Icon icon="gd:logo" width="24" height="24" />
      <Icon icon="gd:logo" width="32" height="32" />
      <Icon icon="gd:logo" width="48" height="48" />
      
      {/* Using CSS font-size (icons scale proportionally) */}
      <Icon icon="gd:logo" style={{ fontSize: '2rem' }} />
    </div>
  );
}

// ============================================================================
// Example 3: Icons with Custom Colors
// ============================================================================

export function IconColorsExample() {
  return (
    <div>
      {/* Using style prop */}
      <Icon icon="gd:home" style={{ color: '#1976d2' }} />
      <Icon icon="gd:home" style={{ color: '#388e3c' }} />
      <Icon icon="gd:home" style={{ color: '#d32f2f' }} />
      
      {/* Using CSS class (define in your CSS file) */}
      <Icon icon="gd:home" className="primary-color" />
      <Icon icon="gd:home" className="secondary-color" />
    </div>
  );
}

// ============================================================================
// Example 4: Icons in Buttons
// ============================================================================

export function IconButtonsExample() {
  return (
    <div>
      {/* Icon with text */}
      <button>
        <Icon icon="gd:home" width="20" height="20" />
        <span>Home</span>
      </button>
      
      {/* Icon only button */}
      <button aria-label="Menu">
        <Icon icon="gd:menu" width="24" height="24" />
      </button>
      
      {/* Icon at the end */}
      <button>
        <span>Search</span>
        <Icon icon="gd:search" width="20" height="20" />
      </button>
    </div>
  );
}

// ============================================================================
// Example 5: Icons in Navigation
// ============================================================================

export function IconNavigationExample() {
  const navItems = [
    { icon: 'gd:home', label: 'Home', path: '/' },
    { icon: 'gd:search', label: 'Search', path: '/search' },
    { icon: 'gd:menu', label: 'Menu', path: '/menu' },
  ];

  return (
    <nav>
      {navItems.map((item) => (
        <a key={item.path} href={item.path}>
          <Icon icon={item.icon} width="20" height="20" />
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}

// ============================================================================
// Example 6: Icons with Transformations
// ============================================================================

export function IconTransformationsExample() {
  return (
    <div>
      {/* Rotate icon */}
      <Icon icon="gd:logo" rotate={1} /> {/* 90 degrees */}
      <Icon icon="gd:logo" rotate={2} /> {/* 180 degrees */}
      <Icon icon="gd:logo" rotate={3} /> {/* 270 degrees */}
      
      {/* Flip icon */}
      <Icon icon="gd:logo" hFlip={true} /> {/* Horizontal flip */}
      <Icon icon="gd:logo" vFlip={true} /> {/* Vertical flip */}
      <Icon icon="gd:logo" hFlip={true} vFlip={true} /> {/* Both */}
    </div>
  );
}

// ============================================================================
// Example 7: Icons in Lists
// ============================================================================

export function IconListExample() {
  const items = [
    { id: 1, icon: 'gd:home', text: 'Dashboard' },
    { id: 2, icon: 'gd:search', text: 'Search Results' },
    { id: 3, icon: 'gd:menu', text: 'Settings' },
  ];

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
          <Icon icon={item.icon} width="16" height="16" />
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// Example 8: Icons with Loading State
// ============================================================================

export function IconLoadingExample() {
  return (
    <div>
      {/* Iconify handles loading automatically */}
      {/* Icons appear when loaded, no placeholder needed */}
      <Icon icon="gd:logo" width="24" height="24" />
      
      {/* You can add your own loading indicator if needed */}
      <div className="icon-container">
        <Icon icon="gd:logo" width="24" height="24" />
        <div className="loading-spinner" />
      </div>
    </div>
  );
}

// ============================================================================
// Example 9: Icons in Cards
// ============================================================================

export function IconCardsExample() {
  const features = [
    {
      icon: 'gd:home',
      title: 'Easy to Use',
      description: 'Simple and intuitive interface',
    },
    {
      icon: 'gd:search',
      title: 'Fast Search',
      description: 'Find what you need quickly',
    },
    {
      icon: 'gd:menu',
      title: 'Organized',
      description: 'Everything in its place',
    },
  ];

  return (
    <div className="cards-grid">
      {features.map((feature) => (
        <div key={feature.title} className="card">
          <Icon icon={feature.icon} width="48" height="48" />
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Example 10: Icons with Inline Styles
// ============================================================================

export function IconInlineStylesExample() {
  return (
    <div>
      <Icon
        icon="gd:logo"
        width="32"
        height="32"
        style={{
          color: '#1976d2',
          marginRight: '8px',
          verticalAlign: 'middle',
        }}
      />
      
      <Icon
        icon="gd:home"
        style={{
          fontSize: '2rem',
          color: '#388e3c',
          cursor: 'pointer',
          transition: 'color 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#2e7d32';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#388e3c';
        }}
      />
    </div>
  );
}

// ============================================================================
// Example 11: Reusable Icon Component
// ============================================================================

interface CustomIconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export function CustomIcon({ name, size = 24, color, className }: CustomIconProps) {
  return (
    <Icon
      icon={`gd:${name}`}
      width={size}
      height={size}
      style={{ color }}
      className={className}
    />
  );
}

// Usage:
export function CustomIconUsageExample() {
  return (
    <div>
      <CustomIcon name="logo" size={32} color="#1976d2" />
      <CustomIcon name="home" size={24} />
      <CustomIcon name="search" className="icon-primary" />
    </div>
  );
}

// ============================================================================
// Example 12: Icons with Accessibility
// ============================================================================

export function IconAccessibilityExample() {
  return (
    <div>
      {/* Icon with aria-label for screen readers */}
      <button aria-label="Go to home page">
        <Icon icon="gd:home" width="24" height="24" aria-hidden="true" />
      </button>
      
      {/* Icon with visible text (no aria-label needed) */}
      <button>
        <Icon icon="gd:search" width="20" height="20" aria-hidden="true" />
        <span>Search</span>
      </button>
      
      {/* Decorative icon (aria-hidden) */}
      <div>
        <Icon icon="gd:logo" width="48" height="48" aria-hidden="true" />
        <h1>Welcome to Our App</h1>
      </div>
    </div>
  );
}
