import { matchPhotos } from "./scripts/match-photos.mjs";

// Before every build: leave out hidden players and link the photos in
// public/players by file name (writes src/data/roster.json). See scripts/match-photos.mjs.
matchPhotos();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
