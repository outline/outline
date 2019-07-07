// @flow
import MarkdownSerializer from 'slate-md-serializer';
const Markdown = new MarkdownSerializer();

export default function parseDocumentIds(text: string) {
  const value = Markdown.deserialize(text);
  let links = [];

  function findLinks(node) {
    if (node.type === 'link') {
      const href = node.data.get('href');

      if (href.startsWith('/doc')) {
        const tokens = href.replace(/\/$/, '').split('/');
        const lastToken = tokens[tokens.length - 1];
        links.push(lastToken);
      }
    }

    if (!node.nodes) {
      return;
    }

    node.nodes.forEach(findLinks);
  }

  findLinks(value.document);
  return links;
}
