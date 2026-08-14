import Vue from 'vue';
import VueApollo from 'vue-apollo';
import createDefaultClient from '~/lib/graphql';
import { initVueApp } from '~/lib/utils/vue3compat/init_vue_app';
import App from './components/app.vue';

Vue.use(VueApollo);

const apolloProvider = new VueApollo({
  defaultClient: createDefaultClient(),
});

export default (el) => {
  if (!el) return null;

  const {
    namespacePath,
    organizationId,
    emptyListSvgPath,
    newPolicyPath,
    listPath,
    view,
    policyId,
  } = el.dataset;

  return initVueApp({
    el,
    apolloProvider,
    name: 'PolicyStoreRoot',
    provide: {
      namespacePath,
      organizationId,
      emptyListSvgPath,
      newPolicyPath: newPolicyPath || '',
      listPath: listPath || '',
      initialView: view || 'list',
      policyId: policyId || '',
    },
    component: App,
  });
};
