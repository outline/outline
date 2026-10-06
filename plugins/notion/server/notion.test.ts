import { NotionClient } from "./notion";

describe("NotionClient", () => {
  describe("fetchPage", () => {
    it("includes tag names read from Tags/Labels properties", async () => {
      const client = new NotionClient("invented-access-token");

      // The Notion SDK client is replaced directly rather than mocking the
      // module, so only the endpoints this test exercises need a shape.
      (client as unknown as { client: unknown }).client = {
        pages: {
          retrieve: () =>
            Promise.resolve({
              object: "page",
              id: "invented-page-id",
              created_time: "2024-01-01T00:00:00.000Z",
              last_edited_time: "2024-01-02T00:00:00.000Z",
              created_by: { id: "invented-user-id" },
              icon: null,
              properties: {
                Name: {
                  id: "title",
                  type: "title",
                  title: [{ plain_text: "Invented page" }],
                },
                Tags: {
                  id: "prop-1",
                  type: "multi_select",
                  multi_select: [
                    { id: "opt-1", name: "invented-tag-one", color: "blue" },
                    { id: "opt-2", name: "invented-tag-two", color: "red" },
                  ],
                },
              },
            }),
        },
        users: {
          retrieve: () =>
            Promise.resolve({ type: "person", name: "Invented Author" }),
        },
        blocks: {
          children: {
            list: () =>
              Promise.resolve({
                results: [],
                has_more: false,
                next_cursor: null,
              }),
          },
        },
      };

      const result = await client.fetchPage("invented-page-id", {
        titleMaxLength: 255,
      });

      expect(result.tags).toEqual(["invented-tag-one", "invented-tag-two"]);
      expect(result.title).toEqual("Invented page");
    });
  });
});
