import { getEventTargetElement } from "./eventTarget";

describe.runIf(typeof document !== "undefined")("getEventTargetElement", () => {
  it("returns the element when the target is an element", () => {
    const element = document.createElement("div");
    const event = new MouseEvent("mousedown");
    Object.defineProperty(event, "target", { value: element });

    expect(getEventTargetElement(event)).toBe(element);
  });

  it("returns the parent element when the target is a text node", () => {
    const element = document.createElement("span");
    const text = document.createTextNode("diagram label");
    element.appendChild(text);
    const event = new MouseEvent("mousedown");
    Object.defineProperty(event, "target", { value: text });

    const result = getEventTargetElement(event);
    expect(result).toBe(element);
    expect(result?.closest("span")).toBe(element);
  });

  it("returns null when the text node has no parent", () => {
    const text = document.createTextNode("detached");
    const event = new MouseEvent("mousedown");
    Object.defineProperty(event, "target", { value: text });

    expect(getEventTargetElement(event)).toBeNull();
  });

  it("returns null when the event has no target", () => {
    expect(getEventTargetElement(new MouseEvent("mousedown"))).toBeNull();
  });
});
