let loadingApi = null;

export function setLoadingApi(api) {
  loadingApi = api;
}

export function loading() {
  return loadingApi;
}

// helper เรียกแบบสั้น ๆ
export function showLoading(message) {
  loadingApi?.show(message);
}

export function hideLoading() {
  loadingApi?.hide();
}
