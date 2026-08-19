const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');

const sass = require('sass');

module.exports = function materialScssLoader(source) {
  const done = this.async();

  try {
    const result = sass.compileString(source, {
      url: pathToFileURL(this.resourcePath),
      loadPaths: [
        path.dirname(this.resourcePath),
        path.join(this.rootContext, 'app/assets/stylesheets'),
        path.join(this.rootContext, 'node_modules'),
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
