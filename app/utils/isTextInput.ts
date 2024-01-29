const inputs = ["input", "select", "button", "textarea"]; // detect if node is a text input element

export default function isTextInput(element: Element): boolean {
  return !!(
    element &&
    element.tagName &&
    (inputs.indexOf(element.tagName.toLowerCase()) !== -1 ||
      element.attributes.getNamedItem("role")?.value === "textbox" ||
      element.attributes.getNamedItem("contenteditable")?.value === "true")
  );
}
