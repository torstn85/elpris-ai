/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // OG-rutterna läser typsnitt och logga från assets/ vid körning.
    outputFileTracingIncludes: {
      "/og/**/*": ["./assets/**/*"],
    },
  },
};

export default nextConfig;
