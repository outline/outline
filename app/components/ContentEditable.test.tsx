import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import ContentEditable from "./ContentEditable";

describe("ContentEditable placeholder", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  function render(value: string, onChange = vi.fn()) {
    act(() => {
      root.render(
        <ContentEditable
          value={value}
          placeholder="Add a reason…"
          onChange={onChange}
        />
      );
    });
    const content = container.querySelector<HTMLSpanElement>("[role=textbox]");
    if (!content) {
      throw new Error("ContentEditable textbox was not rendered");
    }
    return content;
  }

  it.each(["", "<br>", "<div><br></div>"])(
    "shows the placeholder after deletion leaves %j in the DOM",
    (html) => {
      const onChange = vi.fn();
      const content = render("Previous reason", onChange);
      act(() => {
        content.focus();
        content.innerHTML = html;
        content.dispatchEvent(new Event("input", { bubbles: true }));
      });

      expect(onChange).toHaveBeenLastCalledWith("");
      expect(content.dataset.empty).toBe("true");
      expect(content.innerHTML).toBe(html);
      expect(document.activeElement).toBe(content);

      act(() => {
        content.textContent = "New reason";
        content.dispatchEvent(new Event("input", { bubbles: true }));
      });

      expect(onChange).toHaveBeenLastCalledWith("New reason");
      expect(content.dataset.empty).toBe("false");
    }
  );

  it("updates the placeholder when the value changes outside the field", () => {
    const content = render("");
    expect(content.dataset.empty).toBe("true");

    render("New reason");
    expect(content.textContent).toBe("New reason");
    expect(content.dataset.empty).toBe("false");

    render("");
    expect(content.textContent).toBe("");
    expect(content.dataset.empty).toBe("true");
  });

  it("keeps the placeholder tied to the text being edited during external updates", () => {
    const content = render("Previous reason");
    act(() => {
      content.focus();
      content.innerHTML = "<br>";
      content.dispatchEvent(new Event("input", { bubbles: true }));
    });

    render("External reason");
    expect(content.innerHTML).toBe("<br>");
    expect(content.dataset.empty).toBe("true");
  });
});
