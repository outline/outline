const inputs = ["input", "select", "button", "textarea"]; // detect if node is a text input element

/**
 * Checks whether an element accepts text input, such as an input, textarea,
 * select, or contenteditable element.
 *
 * @param element the element to check.
 * @returns true if the element accepts text input.
 */
export default function isTextInput(element: Element): boolean {
  return !!(
    element &&
    element.tagName &&
    (inputs.indexOf(element.tagName.toLowerCase()) !== -1 ||
      element.attributes.getNamedItem("role")?.value === "textbox" ||
      element.attributes.getNamedItem("contenteditable")?.value === "true")
  );
}
