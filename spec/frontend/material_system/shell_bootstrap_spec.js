jest.mock('~/webpack', () => ({}));
jest.mock('~/commons', () => ({}));
jest.mock('~/behaviors/configure_path_helpers', () => ({}));
jest.mock('~/super_sidebar/super_sidebar_bundle', () => ({
  initSuperSidebar: jest.fn(),
  initSuperTopbar: jest.fn(),
  initPageBreadcrumbs: jest.fn(),
  getSuperSidebarData: jest.fn(),
}));
jest.mock('~/material_system/mounts', () => ({
  mountAuthenticatedShell: jest.fn(),
  mountSidebar: jest.fn(),
}));

describe('Material layout bootstrap ownership', () => {
  const payload = { sidebarData: { current_menu_items: [] } };
  const boot = () => {
    let result;
    jest.isolateModules(() => {
      const stock = require('~/super_sidebar/super_sidebar_bundle');
      const material = require('~/material_system/mounts');
      stock.getSuperSidebarData.mockReturnValue(payload);
      require('~/entrypoints/super_sidebar');
      result = { stock, material };
    });
    return result;
  };

  afterEach(() => { document.body.innerHTML = ''; });

  it('assigns marked layout hosts exclusively to Material chrome', () => {
    document.body.innerHTML = '<aside class="m3-shell-sidebar-host" data-material-shell="authenticated-sidebar"></aside><header class="m3-shell-topbar-host" data-material-shell="authenticated-topbar"></header>';
    const { stock, material } = boot();
    expect(material.mountSidebar).toHaveBeenCalledWith(document.querySelector('aside'), { data: payload.sidebarData });
    expect(material.mountAuthenticatedShell).toHaveBeenCalledTimes(1);
    expect(stock.initSuperSidebar).not.toHaveBeenCalled();
    expect(stock.initSuperTopbar).not.toHaveBeenCalled();
    expect(stock.initPageBreadcrumbs).toHaveBeenCalledTimes(1);
  });

  it.each(['admin', 'build', 'pipelines'])('does not create another topbar for the %s page', (surface) => {
    document.body.innerHTML = `<aside class="m3-shell-sidebar-host" data-material-shell="authenticated-sidebar"></aside><header class="m3-shell-topbar-host" data-material-shell="authenticated-topbar"></header><div id="js-material-${surface}"></div>`;
    const { stock, material } = boot();
    expect(material.mountAuthenticatedShell).not.toHaveBeenCalled();
    expect(stock.initSuperTopbar).not.toHaveBeenCalled();
    expect(document.querySelector('header').hidden).toBe(true);
    expect(material.mountSidebar).toHaveBeenCalledTimes(1);
  });

  it('preserves the original bootstrap for unmarked layouts', () => {
    document.body.innerHTML = '<aside class="js-super-sidebar"></aside><header class="js-super-topbar"></header>';
    const { stock, material } = boot();
    expect(stock.initSuperSidebar).toHaveBeenCalledWith(payload);
    expect(stock.initSuperTopbar).toHaveBeenCalledWith(payload);
    expect(material.mountSidebar).not.toHaveBeenCalled();
    expect(material.mountAuthenticatedShell).not.toHaveBeenCalled();
  });

  it('honors the explicit server marker for additional page-owned topbars', () => {
    document.body.innerHTML = '<aside class="m3-shell-sidebar-host" data-material-shell="authenticated-sidebar"></aside><header class="m3-shell-topbar-host" data-material-shell="authenticated-topbar"></header><div data-material-topbar-owner="surface.plan"></div>';
    const { stock, material } = boot();
    expect(stock.initSuperTopbar).not.toHaveBeenCalled();
    expect(material.mountAuthenticatedShell).not.toHaveBeenCalled();
    expect(document.querySelector('header').hidden).toBe(true);
  });
});
