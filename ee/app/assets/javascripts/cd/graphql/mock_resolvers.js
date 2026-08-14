import { getIdFromGraphQLId } from '~/graphql_shared/utils';

// Type policies for CD Service fields the backend does not expose yet. Each read
// returns the cached server value when present and otherwise a deterministic mock
// keyed off the service id. To remove when the backend ships these fields: delete
// this file, drop the cacheConfig in cd/index.js, and remove @client from the
// query files.

const mockByServiceId = (gid, options) => options[(getIdFromGraphQLId(gid) || 0) % options.length];

const MOCK_SYNC = ['synced', 'out-of-sync'];
const MOCK_SERVICE_TYPES = ['http-api', 'worker', 'frontend'];
const MOCK_DEPLOYED_BY = ['@taylor.smith', '@alice.chen', '@morgan.ray'];

export const cdMockTypePolicies = {
  CdService: {
    fields: {
      sync: {
        read: (existing, { readField }) => existing ?? mockByServiceId(readField('id'), MOCK_SYNC),
      },
      serviceType: {
        read: (existing, { readField }) =>
          existing ?? mockByServiceId(readField('id'), MOCK_SERVICE_TYPES),
      },
      deployedBy: {
        read: (existing, { readField }) =>
          existing ?? mockByServiceId(readField('id'), MOCK_DEPLOYED_BY),
      },
    },
  },
};
