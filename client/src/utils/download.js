import api from '../api';

// 通过带认证的 api 请求拉取文件流并触发浏览器下载，文件名由前端指定
export async function downloadReport(url, filename) {
  const { data } = await api.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
