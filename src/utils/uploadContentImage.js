import api from '../api';

export async function uploadContentImage(file) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('Choose an image file.');
  const body = new FormData();
  body.append('file', file, file.name || 'store-image');
  const { data } = await api.post('/content/upload', body);
  if (!data?.imageUrl) throw new Error('The photo could not be uploaded.');
  return data.imageUrl;
}
