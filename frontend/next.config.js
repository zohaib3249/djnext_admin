/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API calls to Django backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_URL + '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
