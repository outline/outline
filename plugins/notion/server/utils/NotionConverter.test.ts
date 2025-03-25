import { Node } from "prosemirror-model";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import nodesWithEmptyTextNode from "@server/test/fixtures/notion-page-with-empty-text-nodes.json";
import allNodes from "@server/test/fixtures/notion-page.json";
import { NotionConverter, NotionPage } from "./NotionConverter";

describe("NotionConverter", () => {
  it("converts a page", () => {
    const response = NotionConverter.page({
      children: allNodes,
    } as NotionPage);

    expect(response).toMatchSnapshot();
    expect(ProsemirrorHelper.toProsemirror(response)).toBeInstanceOf(Node);
  });

  it("converts a page with empty text nodes", () => {
    const response = NotionConverter.page({
      children: nodesWithEmptyTextNode,
    } as NotionPage);

    expect(response).toMatchSnapshot();
    expect(ProsemirrorHelper.toProsemirror(response)).toBeInstanceOf(Node);
  });
});
