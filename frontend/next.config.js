/** @type {import('next').NextConfig} */

// When serving built admin from Django, set base path (e.g. /admin/) so assets load correctly.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || '';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: basePath || undefined,
  assetPrefix: assetPrefix || undefined,
  // API calls to Django backend (only used in dev; production uses full URLs)
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return [
      { source: '/api/:path*', destination: apiUrl + '/api/:path*' },
    ];
  },
  // Ensure static export gets correct asset links
  trailingSlash: false,
};

module.exports = nextConfig;
