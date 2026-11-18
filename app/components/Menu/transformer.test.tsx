import type { ReactElement } from "react";
import type { MenuItem } from "~/types";
import { toMenuItems } from "./transformer";

const noop = () => undefined;

const items: MenuItem[] = [
  { type: "button", title: "Team", onClick: noop },
  { type: "button", title: "Due date", onClick: noop },
  { type: "separator" },
  {
    type: "submenu",
    title: "Move to",
    items: [
      { type: "button", title: "Engineering", onClick: noop },
      { type: "button", title: "Design", onClick: noop },
    ],
  },
  { type: "button", title: "Hidden date", visible: false, onClick: noop },
];

function render(query?: string) {
  return (toMenuItems(items, query) ?? []).filter(
    (element): element is ReactElement => !!element
  );
}

describe("toMenuItems", () => {
  it("returns all visible items without a query", () => {
    expect(render().map((element) => element.key)).toEqual([
      "button-0",
      "button-1",
      "separator-2",
      "submenu-3",
    ]);
  });

  it("returns only matching items and keeps their keys", () => {
    expect(render("DATE").map((element) => element.key)).toEqual(["button-1"]);
  });

  it("keeps a submenu when one of its items matches", () => {
    const [submenu] = render("design");
    expect(submenu.key).toEqual("submenu-3");
  });

  it("returns null when nothing matches", () => {
    expect(toMenuItems(items, "zzz")).toBeNull();
  });
});
