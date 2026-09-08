import createDefaultClient from '~/lib/graphql';
import gql from 'graphql-tag';

const projectAutoRemediationProfileQuery = gql`query ProjectAutoRemediationProfile($fullPath: ID!) { project(fullPath: $fullPath) { id securityScanProfiles { id scanType } } }`;
const attachProfileMutation = gql`mutation AutoRemediationProfileAttach($input: SecurityScanProfileAttachInput!) { securityScanProfileAttach(input: $input) { clientMutationId errors } }`;

export const DEPENDENCY_SCANNING_POST_PROCESSING = 'DEPENDENCY_SCANNING_POST_PROCESSING';
export const DEPENDENCY_BUMP_PROFILE_ID = 'gid://gitlab/Security::ScanProfile/dependency_scanning_post_processing';

export async function ensureDependencyBumpProfile({ projectFullPath, projectGlobalId, allowed = false, apolloClient = createDefaultClient() }) {
  if (allowed !== true) throw new Error('Remediation profile changes are unavailable for your current project access.');
  if (!projectFullPath || !projectGlobalId) throw new Error('The current project identity is unavailable.');
  const response = await apolloClient.query({ query: projectAutoRemediationProfileQuery, variables: { fullPath: projectFullPath }, fetchPolicy: 'network-only' });
  const profiles = response?.data?.project?.securityScanProfiles;
  if (response?.errors?.length || !response?.data?.project?.id || !Array.isArray(profiles)) throw new Error('The server did not return the current remediation profiles.');
  if (profiles.some((profile) => profile.scanType === DEPENDENCY_SCANNING_POST_PROCESSING)) return { attached: false };

  const mutation = await apolloClient.mutate({ mutation: attachProfileMutation, variables: { input: { securityScanProfileId: DEPENDENCY_BUMP_PROFILE_ID, projectIds: [projectGlobalId] } } });
  const errors = mutation?.data?.securityScanProfileAttach?.errors;
  if (mutation?.errors?.length || !Array.isArray(errors)) throw new Error('The server did not confirm the remediation profile attachment.');
  if (errors.length) throw new Error(errors.join(' '));
  return { attached: true };
}
