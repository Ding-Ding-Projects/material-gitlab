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
});
