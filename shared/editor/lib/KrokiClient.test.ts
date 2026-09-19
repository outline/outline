import { inflate } from "pako";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encode, buildUrl, sanitizeSvg, render } from "./KrokiClient";

describe("encode", () => {
  it("produces a valid base64url string for simple input", () => {
    const result = encode("A -> B");
    expect(result).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.length).toBeGreaterThan(0);
  });

  it("round-trips correctly back to the original source", () => {
    const source = "A -> B";
    const encoded = encode(source);

    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(inflate(bytes));

    expect(decoded).toBe(source);
  });

  it("handles empty string", () => {
    const result = encode("");
    expect(result).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles multi-line source with unicode characters", () => {
    const source = "participant Alice\nparticipant Bob\nAlice -> Bob: \u{1F44B} hello\n";
    const encoded = encode(source);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);

    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(inflate(bytes));

    expect(decoded).toBe(source);
  });
});

describe("buildUrl", () => {
  it("returns correct format: {serviceUrl}/{language}/svg/{encoded}", () => {
    const url = buildUrl("https://kroki.io", "graphviz", "digraph { a -> b }", false);
    expect(url).toMatch(/^https:\/\/kroki\.io\/graphviz\/svg\/[A-Za-z0-9_-]+$/);
  });

  it("appends ?theme=200 for D2 dark mode", () => {
    const url = buildUrl("https://kroki.io", "d2", "a -> b", true);
    expect(url).toContain("?theme=200");
    expect(url).toMatch(/^https:\/\/kroki\.io\/d2\/svg\/[A-Za-z0-9_-]+\?theme=200$/);
  });

  it("does not append query param for D2 light mode", () => {
    const url = buildUrl("https://kroki.io", "d2", "a -> b", false);
    expect(url).not.toContain("?");
  });

  it("prepends theme directive to source for PlantUML dark mode", () => {
    const source = "@startuml\nAlice -> Bob\n@enduml";
    const urlDark = buildUrl("https://kroki.io", "plantuml", source, true);
    const urlLight = buildUrl("https://kroki.io", "plantuml", source, false);

    // Dark and light URLs should differ because the source is modified
    expect(urlDark).not.toBe(urlLight);

    // Verify the dark URL encodes the themed source
    const themedSource = `!theme cyborg-outline\n${source}`;
    const expectedEncoded = encode(themedSource);
    expect(urlDark).toBe(`https://kroki.io/plantuml/svg/${expectedEncoded}`);
  });

  it("does not modify source for PlantUML light mode", () => {
    const source = "@startuml\nAlice -> Bob\n@enduml";
    const url = buildUrl("https://kroki.io", "plantuml", source, false);

    const expectedEncoded = encode(source);
    expect(url).toBe(`https://kroki.io/plantuml/svg/${expectedEncoded}`);
  });

  it("prepends theme init config to source for Mermaid dark mode", () => {
    const source = "graph TD\n  A --> B";
    const urlDark = buildUrl("https://kroki.io", "mermaid", source, true);

    const themedSource = `%%{init: {'theme':'dark'}}%%\n${source}`;
    const expectedEncoded = encode(themedSource);
    expect(urlDark).toBe(`https://kroki.io/mermaid/svg/${expectedEncoded}`);
  });
});

describe("sanitizeSvg", () => {
  it("removes simple script tags", () => {
    const svg = '<svg><script>alert("xss")</script><circle r="5"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("</script>");
    expect(result).toContain('<circle r="5"/>');
  });

  it("removes script tags with attributes", () => {
    const svg =
      '<svg><script type="text/javascript">document.cookie</script><rect/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("<script");
    expect(result).not.toContain("</script>");
    expect(result).toContain("<rect/>");
  });

  it("removes inline event handlers", () => {
    const svg =
      '<svg><rect onclick="alert(1)" onload="steal()" onerror="bad()" onmouseover="hover()"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onload");
    expect(result).not.toContain("onerror");
    expect(result).not.toContain("onmouseover");
    expect(result).toContain("<rect");
  });

  it("preserves valid SVG content", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><g><path d="M0 0L10 10"/><text>Hello</text></g></svg>';
    const result = sanitizeSvg(svg);
    expect(result).toBe(svg);
  });

  it("handles SVG with embedded CDATA sections", () => {
    const svg =
      '<svg><style><![CDATA[ .cls { fill: red; } ]]></style><rect class="cls"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).toContain("<![CDATA[");
    expect(result).toContain("<rect");
  });
});

describe("render", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetch with the correct URL", async () => {
    const svgResponse = "<svg><circle/></svg>";
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(svgResponse),
    });

    await render("https://kroki.io", "graphviz", "digraph { a -> b }", false);

    const expectedUrl = buildUrl(
      "https://kroki.io",
      "graphviz",
      "digraph { a -> b }",
      false
    );
    expect(fetchMock).toHaveBeenCalledWith(expectedUrl, { signal: undefined });
  });

  it("returns sanitized SVG on success", async () => {
    const rawSvg = '<svg><script>evil()</script><circle r="5"/></svg>';
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(rawSvg),
    });

    const result = await render("https://kroki.io", "mermaid", "graph TD", false);
    expect(result).not.toContain("<script");
    expect(result).toContain('<circle r="5"/>');
  });

  it("throws on network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      render("https://kroki.io", "plantuml", "A -> B", false)
    ).rejects.toThrow("Failed to fetch");
  });

  it("throws with error message body on 400 response", async () => {
    const errorBody = "Syntax Error: unexpected token at line 2";
    fetchMock.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(errorBody),
    });

    await expect(
      render("https://kroki.io", "plantuml", "invalid source", false)
    ).rejects.toThrow(errorBody);
  });

  it("throws 'Empty response from diagram service' when fetch returns 200 with empty body", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });

    await expect(
      render("https://kroki.io", "d2", "shape: circle", false)
    ).rejects.toThrow("Empty response from diagram service");
  });

  it("throws 'Empty response from diagram service' when fetch returns 200 with whitespace-only body", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("   \n  "),
    });

    await expect(
      render("https://kroki.io", "plantuml", "@startuml\nA->B\n@enduml", false)
    ).rejects.toThrow("Empty response from diagram service");
  });
});
