import slug from 'slug';
import marked from 'marked';
import sanitizedRenderer from 'marked-sanitized';
import highlight from 'highlight.js';
import emojify from './emojify';
import _ from 'lodash';

slug.defaults.mode = 'rfc3986';

const Renderer = sanitizedRenderer(marked.Renderer);
const renderer = new Renderer();
renderer.code = (code, language) => {
  const validLang = !!(language && highlight.getLanguage(language));
  const highlighted = validLang ? highlight.highlight(language, code).value : _.escape(code);
  return `<pre><code class="hljs ${_.escape(language)}">${highlighted}</code></pre>`;
};
renderer.heading = (text, level) => {
  const headingSlug = _.escape(slug(text));
  return `
    <h${level}>
      ${text}
      <a name="${headingSlug}" class="anchor" href="#${headingSlug}">#</a>
    </h${level}>
  `;
};

// TODO: This is syncronous and can be costly
const convertToMarkdown = (text) => {
  return marked.parse(emojify(text), {
    renderer,
    gfm: true,
    tables: true,
    breaks: false,
    pedantic: false,
    smartLists: true,
    smartypants: true,
  });
};

export {
  convertToMarkdown,
};
