import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // In Docker: use API_INTERNAL_URL (http://api:4000) so the Next.js server
    // can reach the API container via Docker's internal network.
    // In local dev: fall back to NEXT_PUBLIC_API_URL or localhost:4000.
    const apiBase = (
      process.env.API_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
      "http://localhost:4000"
    );
    return [
      // Proxy all /api/* requests to the Express backend
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
      // Proxy /uploads/* so browser can fetch uploaded files without CORS
      {
        source: "/uploads/:path*",
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },
};

export default withSerwist(nextConfig);
