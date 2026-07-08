import { renderToString } from "react-dom/server";
import { ServerStyleSheet } from "styled-components";
import { HStack } from "./HStack";
import { VStack } from "./VStack";

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

describe("HStack", () => {
  it("defaults to an 8px gap", () => {
    const { css } = render(<HStack />);
    expect(css).toContain("gap:8px");
  });

  it("accepts spacing tokens", () => {
    const { css } = render(<HStack spacing="lg" />);
    expect(css).toContain("gap:12px");
  });

  it("accepts raw pixel numbers", () => {
    const { css } = render(<HStack spacing={0} />);
    expect(css).toContain("gap:0px");
  });

  it("does not forward the spacing prop to the DOM", () => {
    const { html } = render(<HStack spacing="lg" />);
    expect(html).not.toContain("spacing=");
  });
});

describe("VStack", () => {
  it("stacks vertically with a default 8px gap", () => {
    const { css } = render(<VStack />);
    expect(css).toContain("flex-direction:column");
    expect(css).toContain("gap:8px");
  });

  it("accepts spacing tokens", () => {
    const { css } = render(<VStack spacing="xs" />);
    expect(css).toContain("gap:4px");
  });
});
