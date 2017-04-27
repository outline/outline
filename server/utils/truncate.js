import truncate from 'truncate-html';
import { convertToMarkdown } from '../../frontend/utils/markdown';

truncate.defaultOptions = {
  stripTags: false,
  ellipsis: '...',
  decodeEntities: false,
  excludes: ['h1', 'pre'],
};

const truncateMarkdown = (text, length) => {
  const html = convertToMarkdown(text);
  return truncate(html, length);
};

export { truncateMarkdown };
