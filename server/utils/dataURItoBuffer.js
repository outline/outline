// @flow

export default function dataURItoBuffer(dataURI: string) {
  // convert base64 to buffer
  const buffer = Buffer.from(dataURI.split(",")[1], "base64");

  // separate out the mime component
  const type = dataURI.split(",")[0].split(":")[1].split(";")[0];

  return {
    buffer,
    type,
  };
}
