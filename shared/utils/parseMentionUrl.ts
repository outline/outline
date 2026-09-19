/**
 * Parse a mention:// URL into its components.
 *
 * Supports both the 3-segment format (mention://id/type/modelId) and the
 * 2-segment format (mention://type/modelId).
 *
 * @param url the mention URL to parse.
 * @returns the parsed components, or an empty object if the URL is invalid.
 */
const parseMentionUrl = (
  url: string
): { id?: string; mentionType?: string; modelId?: string } => {
  // The modelId is a UUID, a date (2024-02-03) or a datetime (2024-02-03T13:00).
  const match3 = url.match(
    /^mention:\/\/([a-z0-9-]+)\/([a-z_]+)\/([a-z0-9-]+(?:T\d{2}:\d{2})?)$/
  );
  if (match3) {
    const [id, mentionType, modelId] = match3.slice(1);
    return { id, mentionType, modelId };
  }

  const match2 = url.match(
    /^mention:\/\/([a-z_]+)\/([a-z0-9-]+(?:T\d{2}:\d{2})?)$/
  );
  if (match2) {
    const [mentionType, modelId] = match2.slice(1);
    return { mentionType, modelId };
  }

  return {};
};

export default parseMentionUrl;
