import { parser } from ".";

test("renders an empty doc", () => {
  const ast = parser.parse("");

  expect(ast?.toJSON()).toEqual({
    content: [
      {
        type: "paragraph",
        attrs: {
          dir: undefined,
          textAlign: undefined,
        },
      },
    ],
    type: "doc",
  });
});
