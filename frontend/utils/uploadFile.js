// @flow
import { client } from './ApiClient';
import invariant from 'invariant';

type File = {
  blob: boolean,
  type: string,
  size: number,
  name: string,
  file: string,
};

export default async function uploadFile(file: File) {
  const response = await client.post('/user.s3Upload', {
    kind: file.type,
    size: file.size,
    filename: file.name,
  });

  invariant(response, 'Response should be available');

  const data = response.data;
  const asset = data.asset;
  const formData = new FormData();

  for (const key in data.form) {
    formData.append(key, data.form[key]);
  }

  if (file.blob) {
    formData.append('file', file.file);
  } else {
    // $FlowFixMe
    formData.append('file', file);
  }

  const options: Object = {
    method: 'post',
    body: formData,
  };
  await fetch(data.uploadUrl, options);

  return asset;
}
