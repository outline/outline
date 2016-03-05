import toMd from 'to-markdown';

const liConverter = {
  filter: 'li',
  replacement: (content, node) => {
    // Change `replace(/\n/gm, '\n    ')` to work with our case here :/
    content = content.replace(/^\s+/, '').replace(/\n/gm, '\n    ');
    var prefix = '- ';
    var parent = node.parentNode;
    var index = Array.prototype.indexOf.call(parent.children, node) + 1;

    prefix = /ol/i.test(parent.nodeName) ? index + '.  ' : '- ';
    return prefix + content;
  }
};

const ulConverter = {
  filter: ['ul', 'ol'],
  replacement: function (content, node) {
    var strings = [];
    for (var i = 0; i < node.childNodes.length; i++) {
      strings.push(node.childNodes[i]._replacement);
    }

    if (/li/i.test(node.parentNode.nodeName)) {
      return '\n' + strings.join('\n');
    }
    return '\n\n' + strings.join('\n') + '\n\n';
  }
};

export function toMarkdown(html) {
  const markdown = toMd(
    html, {
      gfm: true,
      converters: [ liConverter, ulConverter ],
    },
  );
  return markdown;
}
