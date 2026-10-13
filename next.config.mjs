/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Photos and logos live in /public, so they are served and optimised locally.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
