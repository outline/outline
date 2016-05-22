import truncate from 'truncate-html';
import marked from 'marked';

truncate.defaultOptions = {
  stripTags: false,
  ellipsis: '...',
  decodeEntities: false,
  excludes: ['h1', 'pre',],
};

const truncateMarkdown = (text, length) => {
  const html = marked(text);
  return truncate(html, length);
};

export {
  truncateMarkdown
};
