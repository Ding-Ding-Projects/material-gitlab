import createMockApollo from 'helpers/mock_apollo_helper';
import { mockResolvers } from '../../graphql/mock_resolvers';
import { createRouter } from '../../router';
import RepositoriesCreateForm from './repositories_create_form.vue';

const BASE_PATH = '/o/gitlab-org/-/artifact_registry/acme/repositories';

export default {
  component: RepositoriesCreateForm,
  title: 'ee/artifact_registry/repositories/create/repositories_create_form',
};

const Template = () => ({
  components: { RepositoriesCreateForm },
  // The page is a route component, so it needs a router to render standalone.
  router: createRouter(BASE_PATH),
  apolloProvider: createMockApollo([], mockResolvers),
  provide: {
    organizationGid: 'gid://gitlab/Organizations::Organization/1',
    slug: 'acme',
  },
  template: '<repositories-create-form />',
});

export const Default = Template.bind({});
