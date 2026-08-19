import axios from '~/lib/utils/axios_utils';

const API_VERSION = 'v4';

function requireProjectPath(projectPath) {
  if (!projectPath || typeof projectPath !== 'string') {
    throw new Error('A project path is required to load this GitLab surface.');
  }
  return encodeURIComponent(projectPath);
}

function projectBase(projectPath) {
  return `/api/${API_VERSION}/projects/${requireProjectPath(projectPath)}`;
}

function projectUrl(projectPath, suffix = '') {
  return `${projectBase(projectPath)}${suffix}`;
}

function unwrap(response) {
  return response.data;
}

export function createGitLabClient(projectPath) {
  requireProjectPath(projectPath);

  return {
    listMergeRequests(params = {}) {
      return axios.get(projectUrl(projectPath, '/merge_requests'), { params }).then(unwrap);
    },
    getMergeRequest(iid, params = {}) {
      return axios.get(projectUrl(projectPath, `/merge_requests/${encodeURIComponent(iid)}`), { params }).then(unwrap);
    },
    getMergeRequestChanges(iid) {
      return axios.get(projectUrl(projectPath, `/merge_requests/${encodeURIComponent(iid)}/changes`)).then(unwrap);
    },
    getMergeRequestApprovals(iid) {
      return axios.get(projectUrl(projectPath, `/merge_requests/${encodeURIComponent(iid)}/approvals`)).then(unwrap);
    },
    listMergeRequestDiscussions(iid, params = {}) {
      return axios.get(projectUrl(projectPath, `/merge_requests/${encodeURIComponent(iid)}/discussions`), { params }).then(unwrap);
    },
    createMergeRequestNote(iid, body) {
      return axios.post(projectUrl(projectPath, `/merge_requests/${encodeURIComponent(iid)}/notes`), { body }).then(unwrap);
    },
    resolveMergeRequestDiscussion(iid, discussionId, resolved) {
      return axios.put(
        projectUrl(projectPath, `/merge_requests/${encodeURIComponent(iid)}/discussions/${encodeURIComponent(discussionId)}`),
        { resolved },
      ).then(unwrap);
    },
    approveMergeRequest(iid) {
      return axios.post(projectUrl(projectPath, `/merge_requests/${encodeURIComponent(iid)}/approve`)).then(unwrap);
    },
    unapproveMergeRequest(iid) {
      return axios.post(projectUrl(projectPath, `/merge_requests/${encodeURIComponent(iid)}/unapprove`)).then(unwrap);
    },
    mergeMergeRequest(iid, options = {}) {
      return axios.put(projectUrl(projectPath, `/merge_requests/${encodeURIComponent(iid)}/merge`), options).then(unwrap);
    },
    updateMergeRequest(iid, options = {}) {
      return axios.put(projectUrl(projectPath, `/merge_requests/${encodeURIComponent(iid)}`), options).then(unwrap);
    },

    listPipelines(params = {}) {
      return axios.get(projectUrl(projectPath, '/pipelines'), { params }).then(unwrap);
    },
    getPipeline(id) {
      return axios.get(projectUrl(projectPath, `/pipelines/${encodeURIComponent(id)}`)).then(unwrap);
    },
    listPipelineJobs(id, params = {}) {
      return axios.get(projectUrl(projectPath, `/pipelines/${encodeURIComponent(id)}/jobs`), { params }).then(unwrap);
    },
    getJobTrace(id) {
      return axios.get(projectUrl(projectPath, `/jobs/${encodeURIComponent(id)}/trace`), { responseType: 'text' }).then(unwrap);
    },
    createPipeline(ref, variables = []) {
      return axios.post(projectUrl(projectPath, '/pipeline'), { ref, variables }).then(unwrap);
    },
    retryPipeline(id) {
      return axios.post(projectUrl(projectPath, `/pipelines/${encodeURIComponent(id)}/retry`)).then(unwrap);
    },
    cancelPipeline(id) {
      return axios.post(projectUrl(projectPath, `/pipelines/${encodeURIComponent(id)}/cancel`)).then(unwrap);
    },
    deletePipeline(id) {
      return axios.delete(projectUrl(projectPath, `/pipelines/${encodeURIComponent(id)}`)).then(unwrap);
    },
    retryJob(id) {
      return axios.post(projectUrl(projectPath, `/jobs/${encodeURIComponent(id)}/retry`)).then(unwrap);
    },
    cancelJob(id) {
      return axios.post(projectUrl(projectPath, `/jobs/${encodeURIComponent(id)}/cancel`)).then(unwrap);
    },

    listBranches(params = {}) {
      return axios.get(projectUrl(projectPath, '/repository/branches'), { params }).then(unwrap);
    },
    listCommits(params = {}) {
      return axios.get(projectUrl(projectPath, '/repository/commits'), { params }).then(unwrap);
    },
    listTags(params = {}) {
      return axios.get(projectUrl(projectPath, '/repository/tags'), { params }).then(unwrap);
    },
    listSnippets(params = {}) {
      return axios.get(projectUrl(projectPath, '/snippets'), { params }).then(unwrap);
    },
    compare(from, to) {
      return axios.get(projectUrl(projectPath, '/repository/compare'), { params: { from, to } }).then(unwrap);
    },

    listJobs(params = {}) {
      return axios.get(projectUrl(projectPath, '/jobs'), { params }).then(unwrap);
    },
    listPipelineSchedules(params = {}) {
      return axios.get(projectUrl(projectPath, '/pipeline_schedules'), { params }).then(unwrap);
    },
    updatePipelineSchedule(id, active) {
      return axios.put(projectUrl(projectPath, `/pipeline_schedules/${encodeURIComponent(id)}`), { active }).then(unwrap);
    },
    listTestCases(params = {}) {
      return axios.get(projectUrl(projectPath, '/test_cases'), { params }).then(unwrap);
    },
    getRepositoryFile(filePath, ref) {
      return axios.get(projectUrl(projectPath, `/repository/files/${encodeURIComponent(filePath)}`), { params: { ref } }).then(unwrap);
    },
    updateRepositoryFile(filePath, payload) {
      return axios.put(projectUrl(projectPath, `/repository/files/${encodeURIComponent(filePath)}`), payload).then(unwrap);
    },
    keepJobArtifacts(jobId) {
      return axios.post(projectUrl(projectPath, `/jobs/${encodeURIComponent(jobId)}/artifacts/keep`)).then(unwrap);
    },
    deleteJobArtifacts(jobId) {
      return axios.delete(projectUrl(projectPath, `/jobs/${encodeURIComponent(jobId)}/artifacts`)).then(unwrap);
    },
  };
}

export { requireProjectPath };
