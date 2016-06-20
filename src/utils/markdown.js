import slug from 'slug';
import marked, { Renderer } from 'marked';
import highlight from 'highlight.js';
import emojify from './emojify';
import _escape from 'lodash/escape';

slug.defaults.mode ='rfc3986';

const renderer = new Renderer();
renderer.code = (code, language) => {
  const validLang = !!(language && highlight.getLanguage(language));
  const highlighted = validLang ? highlight.highlight(language, code).value : _escape(code);
  return `<pre><code class="hljs ${language}">${ highlighted }</code></pre>`;
};
renderer.heading = (text, level) => {
  const headingSlug = slug(text);
  return `
    <h${level}>
      <a name="${headingSlug}" class="anchor" href="#${headingSlug}">
        <span class="header-link">&nbsp;</span>
      </a>
      ${text}
    </h${level}>
  `;
},

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

// TODO: This is syncronous and can be costly
const convertToMarkdown = (text) => {
  return marked(emojify(text));
};

export {
  convertToMarkdown,
};
