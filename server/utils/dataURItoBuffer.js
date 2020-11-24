// @flow

export default function dataURItoBuffer(dataURI: string) {
  const split = dataURI.split(",");

  if (!dataURI.startsWith("data") || split.length <= 1) {
    throw new Error("Not a dataURI");
  }

  // separate out the mime component
  const type = split[0].split(":")[1].split(";")[0];

  // convert base64 to buffer
  const buffer = Buffer.from(split[1], "base64");

  return {
    buffer,
    type,
  };
}
