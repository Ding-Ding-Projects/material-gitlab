const path = require('path');

const loader = require('../../../config/webpack/loaders/material_scss_loader');

describe('material_scss_loader', () => {
  it('compiles SCSS through the webpack 4 callback contract', async () => {
    const dependencies = [];
    const css = await new Promise((resolve, reject) => {
      loader.call(
        {
          resourcePath: path.join(__dirname, 'fixture.scss'),
          rootContext: path.resolve(__dirname, '../../..'),
          addDependency: (dependency) => dependencies.push(dependency),
          async: () => (error, output) => (error ? reject(error) : resolve(output)),
        },
        '$tone: #6750a4; .surface { color: $tone; &__title { display: block; } }',
      );
    });

    expect(css).toContain('color: #6750a4');
    expect(css).toContain('.surface__title');
    expect(dependencies).toContain(path.join(__dirname, 'fixture.scss'));
  });

  it('resolves a repository-root-relative import when rootContext is the webpack build context', async () => {
    // config/webpack.config.js sets `context: path.join(ROOT_PATH, 'app/assets/javascripts')`,
    // so in the real production build `this.rootContext` is that directory, not the repository
    // root. This case reproduces that exact context and proves the loader still finds an
    // `app/assets/stylesheets`-relative partial, which is what six material_system surfaces
    // (Epics, MergeRequests, Settings, Issues, Plan, and the shared shell) import.
    const repoRoot = path.resolve(__dirname, '../../..');
    const resourcePath = path.join(
      repoRoot,
      'app/assets/javascripts/material_system/surfaces/Settings/settings.scss',
    );
    const dependencies = [];

    const css = await new Promise((resolve, reject) => {
      loader.call(
        {
          resourcePath,
          rootContext: path.join(repoRoot, 'app/assets/javascripts'),
          addDependency: (dependency) => dependencies.push(dependency),
          async: () => (error, output) => (error ? reject(error) : resolve(output)),
        },
        "@import 'md3/material_web_geometry';\n.st-tab-panel { display: flex; }",
      );
    });

    expect(css).toContain('.st-tab-panel');
  });
});
