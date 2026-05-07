import { Node } from "prosemirror-model";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import nodesWithEmptyTextNode from "@server/test/fixtures/notion-page-with-empty-text-nodes.json";
import allNodes from "@server/test/fixtures/notion-page.json";
import type { ProsemirrorData, ProsemirrorDoc } from "@shared/types";
import type { NotionPage } from "./NotionConverter";
import { NotionConverter } from "./NotionConverter";

const generatedId = "550e8400-e29b-41d4-a716-446655440000";

function normalizeGeneratedIds(node: ProsemirrorDoc | ProsemirrorData) {
  if (node.type === "container_toggle" && node.attrs) {
    node.attrs.id = generatedId;
  }

  node.content?.forEach(normalizeGeneratedIds);
}

describe("NotionConverter", () => {
  it("converts a page", () => {
    const response = NotionConverter.page({
      children: allNodes,
    } as NotionPage);

    normalizeGeneratedIds(response);
    expect(response).toMatchSnapshot();
    expect(ProsemirrorHelper.toProsemirror(response)).toBeInstanceOf(Node);
  });

  it("converts a page with empty text nodes", () => {
    const response = NotionConverter.page({
      children: nodesWithEmptyTextNode,
    } as NotionPage);

    normalizeGeneratedIds(response);
    expect(response).toMatchSnapshot();
    expect(ProsemirrorHelper.toProsemirror(response)).toBeInstanceOf(Node);
  });
});
