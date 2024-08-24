export function inHtmlContext(node: HTMLElement, selector: string) {
  let currentNode = node;
  // start at the closest element
  while (currentNode !== null && currentNode.nodeType !== 1) {
    currentNode = (currentNode.parentElement ||
      currentNode.parentNode) as HTMLElement;
  }
  return (
    currentNode !== null &&
    currentNode.nodeType === 1 &&
    currentNode.closest(selector) !== null
  );
}
