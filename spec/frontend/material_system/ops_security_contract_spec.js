import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../..');
const surfaceRoot = path.join(root, 'app/assets/javascripts/material_system/surfaces');
const source = (relative) => fs.readFileSync(path.join(surfaceRoot, relative), 'utf8');

describe('operations and security design contracts', () => {
  const surfaces = [
    ['Deploy', '#js-material-deploy', 'Deploy.dc.html'],
    ['Operate', '#js-material-operate', 'Operate.dc.html'],
    ['Monitor', '#js-material-monitor', 'Monitor.dc.html'],
    ['Secure', '#js-material-secure', 'Secure.dc.html'],
    ['Security', '#js-security-dashboard', 'Security.dc.html'],
  ];

  it.each(surfaces)('%s has an exact production mount and checked-in design contract', (name, selector, design) => {
    expect(fs.existsSync(path.join(root, 'design', design))).toBe(true);
    const index = source(`${name}/index.js`);
    expect(index).toContain(selector);
    expect(index).toContain('mount');
  });

  it('does not render fixture rows as production defaults', () => {
    ['Deploy/Deploy.vue', 'Operate/Operate.vue', 'Monitor/Monitor.vue', 'Secure/Secure.vue', 'Security/Security.vue'].forEach((file) => {
      const text = source(file);
      expect(text).not.toMatch(/create(?:Initial|Seed)[A-Z]\w*\(/);
      expect(text).toContain('endpoints');
    });
  });

  it('requires live endpoint adapters and an explicit error state', () => {
    ['Deploy/data.js', 'Operate/data.js', 'Monitor/data.js', 'Secure/data.js', 'Security/data.js'].forEach((file) => {
      const text = source(file);
      expect(text).toContain('requestJson');
      expect(text).toContain('requireEndpoint');
    });
    expect(source('Deploy/Deploy.vue')).toContain('loadError');
    expect(source('Security/Security.vue')).toContain('loadError');
  });

  it('negative regression: removing the mount selector is detected', () => {
    const index = source('Deploy/index.js');
    const broken = index.replaceAll("'#js-material-deploy'", "'#js-material-deploy-removed'");
    expect(broken).not.toContain('#js-material-deploy\'');
    expect(index).toContain('#js-material-deploy');
  });
});
