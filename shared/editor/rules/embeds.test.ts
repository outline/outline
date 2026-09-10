import { extensionManager, findNodes, schema } from "../../test/editor";

const serializer = extensionManager.serializer();
const parser = extensionManager.parser({
  schema,
  plugins: extensionManager.rulePlugins,
});

const youtube = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const embedNodes = (markdown: string) =>
  findNodes(parser.parse(markdown)?.toJSON(), "embed");

const linkCount = (markdown: string) => {
  const doc = parser.parse(markdown)?.toJSON();
  return JSON.stringify(doc).split('"link"').length - 1;
};

describe("embeds rule", () => {
  it("converts a paragraph holding a single self-linking URL", () => {
    const embeds = embedNodes(`[${youtube}](${youtube})`);

    expect(embeds).toHaveLength(1);
    expect(embeds[0].attrs?.href).toBe(youtube);
  });

  it("leaves a link whose text differs from its href", () => {
    const markdown = `[Never gonna give you up](${youtube})`;

    expect(embedNodes(markdown)).toHaveLength(0);
    expect(linkCount(markdown)).toBe(1);
  });

  it("leaves a paragraph holding two links", () => {
    const markdown = `[${youtube}](${youtube}) [${youtube}](${youtube})`;

    expect(embedNodes(markdown)).toHaveLength(0);
  });

  it("leaves a link inside a longer sentence", () => {
    const markdown = `Watch [${youtube}](${youtube}) later`;

    expect(embedNodes(markdown)).toHaveLength(0);
  });

  it("leaves a self-linking URL that matches no descriptor", () => {
    const url = "https://example.com/not-embeddable";

    expect(embedNodes(`[${url}](${url})`)).toHaveLength(0);
    expect(linkCount(`[${url}](${url})`)).toBe(1);
  });

  it("leaves a self-linking URL that only the generic embed matches", () => {
    // The generic iframe embed matches every http(s) URL but has matchOnInput
    // disabled, so it must not pull ordinary links into embeds.
    const url = "https://example.com/some/page?a=1";

    expect(embedNodes(`[${url}](${url})`)).toHaveLength(0);
  });

  it("restores an underscore written as %5F by the serializer", () => {
    const href = "https://www.youtube.com/watch?v=dQw4w9WgX_Q";
    const escaped = href.replace(/_/g, "%5F");
    const embeds = embedNodes(`[${escaped}](${escaped})`);

    expect(embeds).toHaveLength(1);
    expect(embeds[0].attrs?.href).toBe(href);
  });

  it("converts inside a table cell, where cell content is a paragraph", () => {
    const markdown = [
      "| a |",
      "| --- |",
      `| [${youtube}](${youtube}) |`,
      "",
    ].join("\n");
    const doc = parser.parse(markdown)?.toJSON();

    // Embed.toMarkdown has an inTable branch, so an embed can live in a cell
    // and serializes to this same shape — parsing it back keeps tables
    // lossless too.
    expect(findNodes(doc, "embed")).toHaveLength(1);
    expect(findNodes(doc, "td")[0].content?.[0].type).toBe("embed");
  });
});

describe("embed markdown round-trip", () => {
  it("survives serialize then parse", () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.embed.create({ href: youtube }),
    ]);

    const markdown = serializer.serialize(doc);
    const embeds = findNodes(parser.parse(markdown)?.toJSON(), "embed");

    expect(embeds).toHaveLength(1);
    expect(embeds[0].attrs?.href).toBe(youtube);
  });

  it("survives serialize then parse with an underscore in the href", () => {
    const href = "https://open.spotify.com/track/a_b_c";
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.embed.create({ href }),
    ]);

    const markdown = serializer.serialize(doc);
    const embeds = findNodes(parser.parse(markdown)?.toJSON(), "embed");

    expect(embeds).toHaveLength(1);
    expect(embeds[0].attrs?.href).toBe(href);
  });
});
