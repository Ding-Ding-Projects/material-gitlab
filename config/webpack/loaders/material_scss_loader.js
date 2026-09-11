const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');

const sass = require('sass');

// The webpack config sets `context` to `app/assets/javascripts` (see
// config/webpack.config.js), so `this.rootContext` inside a webpack loader
// is that directory, not the repository root. Relying on it here made this
// loader search `app/assets/javascripts/app/assets/stylesheets` and
// `app/assets/javascripts/node_modules`, neither of which exists, so any
// `@import` of a repository-root-relative Sass path failed to resolve.
// Derive the repository root from this loader's own file location instead,
// which is stable regardless of how webpack's context is configured.
const REPO_ROOT = path.resolve(__dirname, '../../..');

module.exports = function materialScssLoader(source) {
  const done = this.async();

  try {
    const result = sass.compileString(source, {
      url: pathToFileURL(this.resourcePath),
      loadPaths: [
        path.dirname(this.resourcePath),
        path.join(REPO_ROOT, 'app/assets/stylesheets'),
        path.join(REPO_ROOT, 'node_modules'),
      ],
      style: 'expanded',
    });

    result.loadedUrls
      .filter((url) => url.protocol === 'file:')
      .forEach((url) => this.addDependency(fileURLToPath(url)));

    done(null, result.css);
  } catch (error) {
    done(error);
  }
};
