import type {NextConfig} from 'next';

// The homepage is the static landing page at public/index.html.
// "/" redirects there before the app routes run, so the landing page always shows.
// All other app routes (/login, /services, /dashboard, ...) are unaffected.
const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/', destination: '/index.html', permanent: false }];
  },
};

export default nextConfig;
