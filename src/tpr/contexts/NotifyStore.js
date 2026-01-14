let notifyApi = null;

export function setNotifyApi(api) {
  notifyApi = api;
}

export function notifyOpen(payload) {
  if (!notifyApi) return;
  notifyApi.open(payload);
}

export function notifySuccess(message, opts) {
  if (!notifyApi) return;
  notifyApi.success(message, opts);
}

export function notifyInfo(message, opts) {
  if (!notifyApi) return;
  notifyApi.info(message, opts);
}

export function notifyWarning(message, opts) {
  if (!notifyApi) return;
  notifyApi.warning(message, opts);
}

export function notifyError(message, opts) {
  if (!notifyApi) return;
  notifyApi.error(message, opts);
}
