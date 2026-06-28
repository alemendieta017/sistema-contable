module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors (we already check type errors and compile shared/backend).
    // Let's set it to false so we still compile successfully if eslint is the only problem.
    ignoreBuildErrors: false,
  }
}
