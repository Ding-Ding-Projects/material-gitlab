/**
 * Entry point for the Build surface (Jobs, pipeline editor, schedules,
 * test cases, artifacts). Ported from design/Build.dc.html.
 */
import Build from './Build.vue';

export { default as Build } from './Build.vue';
export * from './data';

/**
 * Mounts the Build surface onto `el`. Kept framework-thin so the caller
 * supplies its own Vue constructor (matching how other GitLab page bundles
 * bootstrap) rather than this module bundling a second copy of Vue.
 *
 * @param {Element|string} el - mount target or selector
 * @param {{ Vue: Function, propsData?: Object }} options
 * @returns {import('vue').default}
 */
export function mountBuildSurface(el, { Vue, propsData = {} } = {}) {
  if (!Vue) throw new Error('mountBuildSurface requires a Vue constructor to be provided.');
  return new Vue({
    name: 'BuildSurfaceRoot',
    render: (h) => h(Build, { props: propsData }),
  }).$mount(el);
}

export default Build;
