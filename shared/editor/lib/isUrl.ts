export default function isUrl(text: string) {
  if (text.match(/\n/)) {
    return false;
  }

  try {
    const url = new URL(text);
    return url.hostname !== "";
  } catch (err) {
    return false;
  }
}
