// @flow
import MarkdownSerializer from 'slate-md-serializer';
const Markdown = new MarkdownSerializer();

export default function parseLinks(text: string) {
  const value = Markdown.deserialize(text);
  let links = [];

  function findLinks(node) {
    if (node.type === 'link') {
      const href = node.data.get('href');
      if (href.startsWith('/doc')) {
        links.push(href);
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
