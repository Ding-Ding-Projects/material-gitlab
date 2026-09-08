import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('material Code and Repository production routes', () => {
  it('hosts Repository on tree and blob routes with separately supplied ref and path', () => {
    const treeView = read('app/views/projects/tree/show.html.haml');
    const blobView = read('app/views/projects/blob/show.html.haml');
    const treeEntry = read('app/assets/javascripts/repository/index.js');
    const blobEntry = read('app/assets/javascripts/pages/projects/blob/show/index.js');

    expect(treeView).toMatch(/#js-material-repository-app\{ data: \{ project_path: @project\.full_path, ref: @ref, path: @path \} \}/);
    expect(blobView).toMatch(/#js-material-repository-app\{ data: \{ project_path: @project\.full_path, ref: @ref, path: @blob\.path \} \}/);
    expect(treeEntry).toMatch(/mountRepositorySurface\(materialRepositoryEl\);/);
    expect(blobEntry).toMatch(/mountRepositorySurface\(materialRepositoryEl\);/);
  });
});
