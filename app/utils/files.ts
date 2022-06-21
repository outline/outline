import invariant from "invariant";
import { client } from "./ApiClient";
import Logger from "./Logger";

type UploadOptions = {
  /** The user facing name of the file */
  name?: string;
  /** The document that this file was uploaded in, if any */
  documentId?: string;
  /** Whether the file should be public in cloud storage */
  public?: boolean;
  /** Callback will be passed a number between 0-1 as upload progresses */
  onProgress?: (fractionComplete: number) => void;
};

export const uploadFile = async (
  file: File | Blob,
  options: UploadOptions = {
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

  // Using XMLHttpRequest instead of fetch because fetch doesn't support progress
  const xhr = new XMLHttpRequest();
  const success = await new Promise((resolve) => {
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && options.onProgress) {
        options.onProgress(event.loaded / event.total);
      }
    });
    xhr.addEventListener("error", () => {
      Logger.error(
        "File upload failed",
        new Error(`${xhr.status} ${xhr.statusText}`)
      );
    });
    xhr.addEventListener("loadend", () => {
      resolve(xhr.readyState === 4 && xhr.status >= 200 && xhr.status < 400);
    });
    xhr.open("POST", data.uploadUrl, true);
    xhr.send(formData);
  });

  if (!success) {
    throw new Error("Upload failed");
  }

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
