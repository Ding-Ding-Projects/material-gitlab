import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

describe('material Code and Repository production routes', () => {
  it.each([['branches', 'index', 'Branches'], ['commits', 'show', 'Commits'], ['tags', 'index', 'Tags']])('hosts Code on %s with its real initial tab', (controller, action, tab) => {
    expect(read(`app/views/projects/${controller}/${action}.html.haml`)).toContain(`material_code_data('${tab}'`);
    expect(read(`app/assets/javascripts/pages/projects/${controller}/${action}/index.js`)).toContain("mountCodeSurface('#js-material-code-app')");
  });
  it.each(['tree', 'blob'])('hosts Repository with explicit %s route metadata', (kind) => {
    const view = read(`app/views/projects/${kind}/show.html.haml`);
    expect(view).toContain(`#js-material-repository-app`);
    expect(view).toContain(`entry_type: '${kind}'`);
    expect(view).toContain('ref: current_ref');
    expect(read(`app/assets/javascripts/pages/projects/${kind}/show/index.js`)).toContain('mountRepositorySurface(materialRepositoryEl)');
  });
});
