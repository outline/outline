import { client } from './ApiClient';

export default async function uploadFile(file) {
  const response = await client.post('/user.s3Upload', {
    kind: file.type,
    size: file.size,
    filename: file.name,
  });

  const data = response.data;
  const asset = data.asset;
  const formData = new FormData();

  for (const key in data.form) {
    formData.append(key, data.form[key]);
  }

  if (file.blob) {
    formData.append('file', file.file);
  } else {
    formData.append('file', file);
  }

  await fetch(data.uploadUrl, {
    method: 'post',
    body: formData,
  });

  return asset;
}
