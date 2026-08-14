/** Fixed IPC names shared by the isolated preload and privileged main process. */
export const CHANNELS = Object.freeze({
  config: 'gitlab-instant/config',
  setConfig: 'gitlab-instant/set-config',
  readiness: 'gitlab-instant/readiness',
  open: 'gitlab-instant/open',
});
