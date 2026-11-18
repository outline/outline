/**
 * Returns the width that blocks can fill in the editor that contains the
 * element, which is the editor's width without its own padding.
 *
 * @param element an element in the editor, or the editor element itself.
 * @returns the width in pixels, or Infinity when the element is not in an editor.
 */
export function contentWidth(element: Element): number {
  const editor = element.closest(".ProseMirror");
  if (!editor) {
    return Infinity;
  }

  const style = getComputedStyle(editor);
  return (
    editor.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight)
  );
}
