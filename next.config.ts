import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["calculatorai.click"],

  // Security headers applied to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Enable XSS filter in older browsers
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Control referrer information sent with requests
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HSTS — force HTTPS (adjust max-age for production)
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // Restrict browser features
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
              "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
              "img-src 'self' data: https:; " +
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co wss://calculatorai.click; " +
              "frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
