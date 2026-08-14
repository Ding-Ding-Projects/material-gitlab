import Vue from 'vue';
import VueApollo from 'vue-apollo';
import createDefaultClient from '~/lib/graphql';
import { initSinglePageApplication } from '~/vue_shared/spa';
import { cdMockTypePolicies } from './graphql/mock_resolvers';
import { createRouter } from './router';

const cdTypePolicies = {
  CdVersionSet: {
    fields: {
      versionSetEntries: { merge: true },
    },
  },
};

export const initCdRoot = () => {
  const el = document.querySelector('.js-cd-root');
  if (!el) {
    return null;
  }

  const { baseRoute } = el.dataset;
  const router = createRouter(baseRoute);

  // cdTypePolicies holds real cache policies; cdMockTypePolicies holds the @client
  // service mocks. When the backend ships CdApplication.services, remove only the
  // mock policies (and revert to apolloCacheConfig: {} in initSinglePageApplication)
  // while keeping cdTypePolicies.
  Vue.use(VueApollo);
  const apolloProvider = new VueApollo({
    defaultClient: createDefaultClient(
      {},
      { cacheConfig: { typePolicies: { ...cdTypePolicies, ...cdMockTypePolicies } } },
    ),
  });

  return initSinglePageApplication({
    name: 'CdRoot',
    el,
    router,
    // Skip auto Apollo creation — we provide our own above.
    apolloCacheConfig: null,
    options: { apolloProvider },
  });
};
