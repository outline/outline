/* oxlint-disable */
import * as React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { vi } from "vitest";
import type { Action, ActionWithChildren } from "~/types";
import { createRootMenuAction } from "~/actions";
import { useMenuAction } from "./useMenuAction";

vi.mock("~/actions", () => ({
  createRootMenuAction: vi.fn((actions: Action[]) => ({
    id: "root",
    type: "action",
    variant: "action_with_children",
    name: "root_action",
    section: "Root",
    children: actions,
  })),
}));

const actions: Action[] = [
  {
    id: "test-action",
    type: "action",
    variant: "action",
    name: "Test action",
    section: "Test",
    perform: () => undefined,
  },
];

function TestComponent() {
  useMenuAction(actions);

  return null;
}

describe("useMenuAction", () => {
  test("should not create a new root action when actions are unchanged", () => {
    const container = document.createElement("div");

    act(() => {
      ReactDOM.render(<TestComponent />, container);
    });
    act(() => {
      ReactDOM.render(<TestComponent />, container);
    });

    expect(createRootMenuAction).toHaveBeenCalledTimes(1);

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
  });
});
