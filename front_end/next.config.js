/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  i18n: {
    locales: ['fa'],
    defaultLocale: 'fa',
    localeDetection: false,
  },
};

module.exports = nextConfig;