const inputs = ["input", "select", "button", "textarea"]; // detect if node is a text input element

export default function isTextInput(element: HTMLElement): boolean {
  return (
    element &&
    (inputs.indexOf(element.tagName.toLowerCase()) !== -1 ||
      element.attributes.getNamedItem("role")?.value === "textbox" ||
      element.attributes.getNamedItem("contenteditable")?.value === "true")
  );
}
