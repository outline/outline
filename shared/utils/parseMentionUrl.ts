const parseMentionUrl = (url: string) => {
  const matches = url.match(
    /^mention:\/\/([a-z0-9-]+)\/([a-z]+)\/([a-z0-9-]+)$/
  );
  if (!matches) {
    return {};
  }
  const [id, mentionType, modelId] = matches.slice(1);
  return { id, mentionType, modelId };
};

export default parseMentionUrl;
