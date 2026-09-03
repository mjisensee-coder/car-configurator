/** @type {import('next').NextConfig} */
const nextConfig = {
  // `next dev` otherwise appends a block to CLAUDE.md on every run. That
  // file is the hand-maintained architecture reference for this repo, so
  // the generator stays off.
  agentRules: false,

  // Pin the workspace root: a stray package-lock.json in the home directory
  // makes Turbopack guess wrongly about where the project starts.
  turbopack: { root: import.meta.dirname },

  // Railway/Docker builds set NEXT_OUTPUT=standalone to get a self-contained
  // server bundle. Vercel ignores this and uses its own output target.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,

  // `pg` uses dynamic requires for its optional native bindings; bundling it
  // breaks the driver. Keep it external in the server runtime.
  serverExternalPackages: ['pg'],

  // three ships untranspiled ESM that Next's server compiler needs to process
  // (drei and @react-three/fiber pull it in from node_modules).
  transpilePackages: ['three'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  async headers() {
    return [
      {
        // 3D assets are content-addressed by filename and never mutate in
        // place — the same policy server.js used to apply by hand.
        source: '/:path(models|environments|hdr|textures|basis)/:file*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
