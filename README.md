# Iconify Private Library

A self-hosted Iconify icon library solution with custom API server and React client integration.

> 📖 **[查看快速开始指南](./QUICKSTART.md)** - 快速了解项目和使用示例

## Project Structure

This is a monorepo containing two packages:

- `packages/api` - Iconify API server (Node.js + Express)
- `packages/client` - React client application

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

Install dependencies for all packages:

```bash
npm install
```

### Development

**Start Both Services:**

```bash
# Terminal 1: Start API server
npm run dev:api

# Terminal 2: Start React client
npm run dev:client
```

Or use the convenience script for the client:

```bash
./start-client.sh
```

The API server will run on http://localhost:3000
The React client will run on http://localhost:5173

### Environment Configuration

Copy the example environment file in the API package:

```bash
cp packages/api/.env.example packages/api/.env
```

Edit the `.env` file to configure your settings.

#### CORS Configuration

The API server supports Cross-Origin Resource Sharing (CORS) to allow client applications from different domains to access the icon API. Proper CORS configuration is essential for security and functionality.

**Configuration Format:**

The `CORS_ORIGIN` environment variable accepts the following formats:

1. **Single domain:**
   ```bash
   CORS_ORIGIN=http://localhost:5173
   ```

2. **Multiple domains (comma-separated):**
   ```bash
   CORS_ORIGIN=http://localhost:5173,https://app.example.com,https://admin.example.com
   ```

3. **Allow all domains (development only):**
   ```bash
   CORS_ORIGIN=*
   ```

4. **Reject all cross-origin requests (empty or not set):**
   ```bash
   CORS_ORIGIN=
   ```

**Environment-Specific Recommendations:**

- **Development:**
  ```bash
  CORS_ORIGIN=http://localhost:5173,http://localhost:3000
  ```
  Include all local development ports you're using.

- **Testing/Staging:**
  ```bash
  CORS_ORIGIN=https://test.example.com,https://test-admin.example.com
  ```
  List all testing environment domains explicitly.

- **Production:**
  ```bash
  CORS_ORIGIN=https://app.example.com,https://admin.example.com,https://www.example.com
  ```
  **Never use wildcard (`*`) in production!** Always explicitly list allowed domains.

**Security Best Practices:**

1. ⚠️ **Never use wildcard (`*`) in production** - This allows any website to access your API, which is a security risk.

2. 🔒 **Always include the full protocol** - Use `https://` for production and `http://` for local development. The protocol must match exactly.

3. 🔢 **Port numbers must match** - `http://localhost:3000` and `http://localhost:5173` are different origins and must be listed separately if both need access.

4. 🌐 **Subdomains are separate origins** - `app.example.com` and `admin.example.com` are different origins and must be configured individually.

5. 📝 **Review and update regularly** - When adding new client applications or domains, update the CORS configuration accordingly.

6. 🔍 **Monitor rejected requests** - Check server logs for CORS errors to identify legitimate clients that may need to be added.

**Troubleshooting CORS Issues:**

If you're experiencing CORS errors in your browser console:

1. **"No 'Access-Control-Allow-Origin' header is present"**
   - Check that `CORS_ORIGIN` is set in your `.env` file
   - Verify the client domain is included in the allowed origins list
   - Ensure the protocol (http/https) and port match exactly

2. **"The CORS policy has blocked the request"**
   - Verify the origin in the browser matches the configured origin exactly
   - Check for typos in domain names
   - Ensure no trailing slashes in the CORS_ORIGIN configuration

3. **Preflight OPTIONS requests failing**
   - The API automatically handles OPTIONS requests
   - Check that your API server is running and accessible
   - Verify no proxy or firewall is blocking OPTIONS requests

4. **Configuration not taking effect**
   - Restart the API server after changing `.env` file
   - Check server logs on startup for CORS configuration messages
   - Verify the `.env` file is in the correct location (`packages/api/.env`)

**Validation on Startup:**

The API server validates CORS configuration on startup and logs:
- ✅ Number of allowed origins and their list
- ⚠️ Warnings if using wildcard in production
- ⚠️ Warnings if no origins are configured
- ❌ Errors for invalid URL formats

Check the server logs when starting the API to confirm your CORS configuration is correct.

## Available Scripts

- `npm run dev:api` - Start API server in development mode
- `npm run dev:client` - Start React client in development mode
- `npm run build:api` - Build API server
- `npm run build:client` - Build React client
- `npm run test` - Run tests for all packages
- `npm run lint` - Lint all code
- `npm run format` - Format all code with Prettier

## Icon Examples

The project includes 4 sample icons in the `gd` namespace:

- **logo** - Shield-shaped logo icon
- **menu** - Hamburger menu icon (three horizontal lines)
- **home** - House icon
- **search** - Search icon (magnifying glass)

### Quick Preview

Open `examples/icon-preview.html` in your browser to see all available icons with different sizes and colors.

### Usage in React

```tsx
import { Icon } from '@iconify/react';

function App() {
  return (
    <div>
      <Icon icon="gd:logo" width="32" height="32" />
      <Icon icon="gd:menu" width="24" height="24" />
      <Icon icon="gd:home" width="20" height="20" />
      <Icon icon="gd:search" width="20" height="20" />
    </div>
  );
}
```

See `examples/` directory for more usage examples.

## Features

### Phase 1 (Completed)
- ✅ File system based icon management
- ✅ SVG parsing and optimization
- ✅ Storage layer with JSON format
- ✅ Icon set manager
- ✅ Cache manager with HTTP headers
- ✅ Basic Iconify API endpoints (/collections, /collection, /icons)
- ✅ React client configured with custom API provider
- ✅ 4 sample icons (logo, menu, home, search)
- ✅ Error handling and logging

### Phase 2 (Completed)
- ✅ Icon upload API
- ✅ Icon deletion API
- ✅ Version management
- ✅ API authentication and rate limiting
- ✅ CORS configuration with multi-domain support

### Phase 3 (Planned)
- Figma integration
- Automatic icon synchronization

## Documentation

- 📖 [快速开始指南](./QUICKSTART.md) - 项目概览和使用示例
- 🔧 [客户端设置说明](./CLIENT_SETUP.md) - React 客户端配置和故障排除
- 📁 [示例目录](./examples/README.md) - 代码示例和使用场景
- 🎨 [图标预览](./examples/icon-preview.html) - 可视化图标展示

## License

Private
