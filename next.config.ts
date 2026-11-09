import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // The static landing page is the public homepage. beforeFiles runs before
  // app routes, so "/" serves public/landing/index.html. The rest of the app
  // (login, dashboard, services, etc.) is unaffected.
  async rewrites() {
    return {
      beforeFiles: [{ source: '/', destination: '/landing/index.html' }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
