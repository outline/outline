import { renderToString } from "react-dom/server";
import { ServerStyleSheet } from "styled-components";
import Flex from "./Flex";

/**
 * Renders an element and collects the styled-components CSS generated for it.
 *
 * @param element the element to render.
 * @returns the rendered html and collected css.
 */
function render(element: React.ReactElement) {
  const sheet = new ServerStyleSheet();
  try {
    const html = renderToString(sheet.collectStyles(element));
    return { html, css: sheet.getStyleTags() };
  } finally {
    sheet.seal();
  }
}

describe("Flex", () => {
  it("supports numeric gap values", () => {
    const { css } = render(<Flex gap={8} />);
    expect(css).toContain("gap:8px");
  });

  it("resolves gap tokens to the same pixels as numbers", () => {
    const { css } = render(<Flex gap="md" />);
    expect(css).toContain("gap:8px");
  });

  it("supports padding and margin token props", () => {
    const { css } = render(<Flex p="md" px="lg" m="sm" my={4} />);
    expect(css).toContain("padding:8px");
    expect(css).toContain("padding-inline:12px");
    expect(css).toContain("margin:6px");
    expect(css).toContain("margin-block:4px");
  });

  it("emits shorthand before axis longhands", () => {
    const { css } = render(<Flex p="md" px="lg" />);
    expect(css.indexOf("padding:8px")).toBeGreaterThan(-1);
    expect(css.indexOf("padding:8px")).toBeLessThan(
      css.indexOf("padding-inline:12px")
    );
  });

  it("emits no padding or margin declarations when props are absent", () => {
    const { css } = render(<Flex column gap={4} />);
    expect(css).not.toContain("padding");
    expect(css).not.toContain("margin");
  });

  it("does not forward spacing props to the DOM", () => {
    const { html } = render(<Flex gap="md" p="md" m="sm" column />);
    expect(html).not.toContain("gap=");
    expect(html).not.toContain("p=");
    expect(html).not.toContain("m=");
    expect(html).not.toContain("column=");
  });
});
