/** @type {import('next').NextConfig} */

// Base path is from Django at runtime (window.__DJNEXT_BASE_PATH in HTML). Do not use env for basePath.
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || '';

// Only use static export when building for Django (npm run build). In dev (next dev) we skip it
// so dynamic routes like /auth/group and /dashboard work without listing every path in generateStaticParams.
const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

const nextConfig = {
  reactStrictMode: true,
  ...(isStaticExport ? { output: 'export' } : {}),
  assetPrefix: assetPrefix || undefined,
  trailingSlash: false,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  // Fixed build ID => predictable chunk/css names (e.g. main-app-djnext_admin.js) for Django static serving.
  generateBuildId: async () => 'djnext_admin',

  // Stable (non-random) JS/CSS paths: use buildId instead of contenthash so Django can serve
  // assets without 404s. Same build => same filenames every time.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.optimize.LimitChunkCountPlugin({
          maxChunks: 1, // Forces all client-side code into one chunk
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
