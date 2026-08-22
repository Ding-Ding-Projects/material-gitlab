/**
 * Entry point for the Pipelines surface. Renders the Pipelines list (status graph,
 * stages, duration) and pipeline detail (job DAG, job log viewer, retry/cancel) ported
 * from design/Pipelines.dc.html.
 */
import Vue from 'vue';
import { createSurfaceInventory } from '../../registry';
import Pipelines from './Pipelines.vue';

export const PIPELINES_SURFACE_ID = 'surface.pipelines';

export { Pipelines };

export {
  statusMeta,
  worstJobStatus,
  buildJobLog,
  fetchPipelines,
  fetchPipelineDetail,
  fetchJobTrace,
  createManualPipeline,
  retriedPipeline,
  canceledPipeline,
  retriedJob,
  FILTER_DEFINITIONS,
} from './data';

/** Registry-shaped surface descriptor; evidence rows are filled in by the completeness pass. */
export function createPipelinesSurfaceInventory() {
  return createSurfaceInventory({
    id: PIPELINES_SURFACE_ID,
    kind: 'page',
    title: 'Pipelines',
    route: '/pipelines',
  });
}

/** Mounts the Pipelines surface onto `el`. Returns the live Vue instance so a host app can destroy it. */
export function mountPipelines(el, { propsData } = {}) {
  const mountEl = typeof el === 'string' ? document.querySelector(el) : el;
  const projectPath = propsData?.projectPath || mountEl?.dataset?.projectPath;
  if (!projectPath) throw new Error('Pipelines surface requires data-project-path.');
  return new Vue({
    el: mountEl,
    render: (h) => h(Pipelines, { props: { ...propsData, projectPath } }),
  });
}

export default Pipelines;
