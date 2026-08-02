module.exports = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  allowedDevOrigins: ['wsl.localhost', 'localhost:3001', 'localhost:3000', '192.168.100.24', '192.168.100.25']
}


