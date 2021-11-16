import invariant from "invariant";
import { client } from "./ApiClient";

type Options = {
  name?: string;
  documentId?: string;
  public?: boolean;
};

export const uploadFile = async (
  file: File | Blob,
  options: Options = {
    name: "",
  }
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

  // @ts-expect-error ts-migrate(2339) FIXME: Property 'blob' does not exist on type 'File | Blo... Remove this comment to see the full error message
  if (file.blob) {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'file' does not exist on type 'File | Blo... Remove this comment to see the full error message
    formData.append("file", file.file);
  } else {
    formData.append("file", file);
  }

  const uploadResponse = await fetch(data.uploadUrl, {
    method: "post",
    body: formData,
  });
  invariant(uploadResponse.ok, "Upload failed, try again?");
  return attachment;
};

export const dataUrlToBlob = (dataURL: string) => {
  const blobBin = atob(dataURL.split(",")[1]);
  const array = [];

  for (let i = 0; i < blobBin.length; i++) {
    array.push(blobBin.charCodeAt(i));
  }

  const file = new Blob([new Uint8Array(array)], {
    type: "image/png",
  });
  return file;
};
