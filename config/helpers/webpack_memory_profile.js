const TerserPlugin = require('terser-webpack-plugin');

// Opt in only for resource-bounded builds. Keep webpack's default elsewhere.
module.exports = function webpackMemoryProfile(value, sourceMaps) {
  if (value === undefined || value === '' || value === 'false') return {};
  if (value !== 'true') throw new Error('WEBPACK_MINIFY_IN_PROCESS must be true or false');
  return {
    minimizer: [new TerserPlugin({ cache: true, parallel: false, sourceMap: sourceMaps })],
  };
};
