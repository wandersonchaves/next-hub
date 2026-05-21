const nodeExternals = require('webpack-node-externals');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      nodeExternals({
        allowlist: [/^@enterprise\/(?!database)/], 
      }),
      '@enterprise/database',
      '@prisma/client',
      '.prisma/client',
      '@prisma/client-runtime-utils',
    ],
  };
};
