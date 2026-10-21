/** @type {import('next').NextConfig} */
const allowedOrigin = process.env.ALLOWED_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  output: process.env.NEXT_OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  serverExternalPackages: ['pdfkit', '@prisma/client'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  async redirects() {
    return [
      {
        source: '/crm',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/portal',
        destination: '/login',
        permanent: false,
      },
      {
        source: '/sign-in',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/auth/sign-in',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/auth/admin/sign-in',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/programmes',
        destination: '/courses',
        permanent: true,
      },
      {
        source: '/programmes/:slug',
        destination: '/courses/:slug',
        permanent: true,
      },
      {
        source: '/direct-booking',
        destination: '/book-session',
        permanent: true,
      },
      {
        source: '/book-counselling',
        destination: '/book-session',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy,
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
