import truncate from 'truncate-html';
import marked, { Renderer } from 'marked';
import highlight from 'highlight.js';

const renderer = new Renderer();
renderer.code = (code, language) => {
  const validLang = !!(language && highlight.getLanguage(language));
  const highlighted = validLang ? highlight.highlight(language, code).value : code;
  return `<pre><code class="hljs ${language}">${highlighted}</code></pre>`;
};


marked.setOptions({
  renderer: renderer,
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: true,
});

// TODO: This is syncronous and can be costly,
// should be performed outside http request
const convertToMarkdown = (text) => {
  return marked(text);
};

truncate.defaultOptions = {
  stripTags: false,
  ellipsis: '...',
  decodeEntities: false,
  excludes: ['h1', 'pre', ],
};

const truncateMarkdown = (text, length) => {
  const html = convertToMarkdown(text);
  return truncate(html, length);
};

export {
  convertToMarkdown,
  truncateMarkdown,
};
