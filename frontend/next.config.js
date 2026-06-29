module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors (we already check type errors and compile shared/backend).
    // Let's set it to false so we still compile successfully if eslint is the only problem.
    ignoreBuildErrors: false,
  },
  allowedDevOrigins: ['wsl.localhost', 'localhost:3001', 'localhost:3000', '192.168.100.24', '192.168.100.25']
}

