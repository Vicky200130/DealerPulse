/** @type {import('next').NextConfig} */
const nextConfig = {
  // In local dev, proxy /api/* to the FastAPI server on :8000 so the
  // frontend can call the backend same-origin. In production on Vercel,
  // routing is handled by vercel.json instead.
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        { source: '/api/:path*', destination: 'http://127.0.0.1:8000/api/:path*' },
      ];
    }
    return [];
  },
};

export default nextConfig;
