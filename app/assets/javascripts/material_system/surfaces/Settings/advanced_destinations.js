import createDefaultClient from '~/lib/graphql';
import { getTransferLocations } from '~/api/projects_api';
import { parseIntPagination, normalizeHeaders } from '~/lib/utils/common_utils';
import { getIdFromGraphQLId } from '~/graphql_shared/utils';
import currentUserNamespace from '~/projects/settings/graphql/queries/current_user_namespace.query.graphql';

const destination = ({ id, full_name: humanName, full_path: fullPath }) => {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0 || typeof humanName !== 'string' || typeof fullPath !== 'string') throw new Error('A transfer destination is invalid.');
  return { id: String(id), humanName, fullPath };
};

export async function loadTransferDestinations({ projectId, page = 1, query = '', showUserTransferLocations = false, apolloClient = createDefaultClient() }) {
  const groupResponse = await getTransferLocations(projectId, { page, search: query });
  if (!Array.isArray(groupResponse.data)) throw new Error('Transfer destination data is invalid.');
  const groups = groupResponse.data.map(destination);
  const { totalPages } = parseIntPagination(normalizeHeaders(groupResponse.headers));
  let users = [];

  if (page === 1 && showUserTransferLocations) {
    try {
      const response = await apolloClient.query({ query: currentUserNamespace });
      const namespace = response?.data?.currentUser?.namespace;
      if (namespace?.id && namespace.fullName && namespace.fullPath) {
        users = [{ id: String(getIdFromGraphQLId(namespace.id)), humanName: namespace.fullName, fullPath: namespace.fullPath }];
      }
    } catch (_error) {
      // The group results remain valid when the optional user namespace lookup is unavailable.
    }
  }

  return { groups, users, totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1 };
}
