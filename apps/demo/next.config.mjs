import createNextIntlPlugin from 'next-intl/plugin';
// Consumes the BUILT @nabcor/core/security (dist JS) — no duplicated headers.
// Works in the config bootstrap because the module is compiled and
// self-contained. Requires @nabcor/core to be built first (demo `prebuild`).
import { securityHeaders } from '@nabcor/core/security';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  transpilePackages: ['@nabcor/core', '@nabcor/theme-novalt', '@nabcor/theme-plain'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders() }];
  },
};

export default withNextIntl(nextConfig);
