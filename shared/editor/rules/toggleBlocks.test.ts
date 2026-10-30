import { findNodes, parser } from "../../test/editor";

it("assigns a unique id to each parsed toggle block", () => {
  const ast = parser.parse("+++ One\nBody\n+++\n\n+++ Two\nBody\n+++");
  const ids = findNodes(ast?.toJSON(), "container_toggle").map(
    (node) => node.attrs?.id
  );

  expect(ids).toHaveLength(2);
  expect(ids[0]).toEqual(expect.any(String));
  expect(ids[1]).toEqual(expect.any(String));
  expect(ids[0]).not.toEqual(ids[1]);
});
