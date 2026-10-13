const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Supabase Storage public bucket (hosted projects)
      { protocol: "https", hostname: "**.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Custom / self-hosted Supabase domain, if configured
      ...(supabaseHost && !supabaseHost.endsWith(".supabase.co")
        ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
        : []),
    ],
  },
  experimental: {
    // Photo / logo uploads go through server actions
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
