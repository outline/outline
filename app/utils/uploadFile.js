// @flow
import { client } from "./ApiClient";
import invariant from "invariant";

type Options = {
  name?: string,
  documentId?: string,
  public?: boolean,
};

export const uploadFile = async (
  file: File | Blob,
  options?: Options = { name: "" }
) => {
  const name = file instanceof File ? file.name : options.name;
  const response = await client.post("/attachments.create", {
    public: options.public,
    documentId: options.documentId,
    contentType: file.type,
    size: file.size,
    name,
  });

  invariant(response, "Response should be available");

  const data = response.data;
  const attachment = data.attachment;
  const formData = new FormData();

  for (const key in data.form) {
    formData.append(key, data.form[key]);
  }

  // $FlowFixMe
  if (file.blob) {
    // $FlowFixMe
    formData.append("file", file.file);
  } else {
    formData.append("file", file);
  }

  await fetch(data.uploadUrl, {
    method: "post",
    body: formData,
  });

  return attachment;
};

export const dataUrlToBlob = (dataURL: string) => {
  var blobBin = atob(dataURL.split(",")[1]);
  var array = [];
  for (var i = 0; i < blobBin.length; i++) {
    array.push(blobBin.charCodeAt(i));
  }
  const file = new Blob([new Uint8Array(array)], { type: "image/png" });
  return file;
};
