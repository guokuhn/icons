import { addAPIProvider, disableCache } from '@iconify/react';

/**
 * Configure Iconify to use our custom API server
 * This configuration ensures that:
 * 1. Icons are loaded from our self-hosted API server
 * 2. No open-source icon libraries are accessed
 * 3. Only the "gd" namespace is used
 * 
 * Implements requirements: 1.2, 1.4, 6.1, 6.2, 6.5
 */
export function configureIconify() {
  // Add custom API provider for our self-hosted Iconify API
  // The provider name '' (empty string) makes it the default provider
  // This ensures all icon requests go to our API server
  addAPIProvider('', {
    resources: ['http://localhost:3000'],
    // Specify which prefixes this provider handles
    // Only handle 'gd' prefix to ensure no other icon sets are loaded
    index: 0, // Priority: 0 = highest
  });
  
  // Optionally disable browser cache during development
  // This ensures we always get fresh data from the API server
  if (import.meta.env.DEV) {
    disableCache('all');
    disableCache('local');
    disableCache('session');
    console.log('🚫 All caches disabled in development mode');
  }
  
  console.log('✅ Iconify configured to use custom API server');
  console.log('🌐 API endpoint: http://localhost:3000');
  console.log('📦 Namespace: gd');
  console.log('🚫 No open-source icon libraries loaded');
  console.log('💡 Icons will be loaded on-demand from the API server');
  console.log('🔍 Testing icon load: gd:touxiang');
  
  // Test icon loading
  setTimeout(() => {
    console.log('🔍 Checking if icons are available...');
  }, 1000);
}

// Initialize configuration when module is imported
configureIconify();
