import { Node } from "prosemirror-model";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import data from "@server/test/fixtures/notion-page.json";
import { NotionConverter, NotionPage } from "./NotionConverter";

describe("NotionConverter", () => {
  it("converts a page", () => {
    const response = NotionConverter.page({
      children: data,
    } as NotionPage);

    expect(response).toMatchSnapshot();
    expect(ProsemirrorHelper.toProsemirror(response)).toBeInstanceOf(Node);
  });
});
