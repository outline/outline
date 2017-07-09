// @flow
import slug from 'slug';
import marked from 'marked';
import sanitizedRenderer from 'marked-sanitized';
import highlight from 'highlight.js';
import _ from 'lodash';
import emojify from './emojify';
import toc from './toc';

// $FlowIssue invalid flow-typed
slug.defaults.mode = 'rfc3986';

const Renderer = sanitizedRenderer(marked.Renderer);
const renderer = new Renderer();
renderer.code = (code, language) => {
  const validLang = !!(language && highlight.getLanguage(language));
  const highlighted = validLang
    ? highlight.highlight(language, code).value
    : _.escape(code);
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

const convertToMarkdown = (text: string) => {
  // Add TOC
  text = toc.insert(text || '', {
    slugify: heading => {
      // FIXME: E.g. `&` gets messed up
      const headingSlug = _.escape(slug(heading));
      return headingSlug;
    },
  });

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

export { convertToMarkdown };
