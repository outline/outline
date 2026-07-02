/* oxlint-disable */
import * as React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { vi } from "vitest";
import type { ActionWithChildren } from "~/types";
import { actionToMenuItem } from "~/actions";
import { ContextMenu } from "./ContextMenu";

vi.mock("~/actions", () => ({
  actionToMenuItem: vi.fn(() => ({
    type: "button",
    title: "Child",
    visible: true,
    onClick: () => undefined,
  })),
}));

vi.mock("~/hooks/useActionContext", () => ({
  default: () => ({
    isMenu: true,
  }),
}));

vi.mock("~/hooks/useMobile", () => ({
  default: () => false,
}));

vi.mock("~/components/primitives/Menu", async () => {
  const ReactModule = await import("react");

  return {
    Menu: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    MenuTrigger: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    MenuContent: ReactModule.forwardRef<
      HTMLDivElement,
      { children: React.ReactNode }
    >(function MenuContent({ children }, ref) {
      return <div ref={ref}>{children}</div>;
    }),
    MenuButton: ({ label }: { label: React.ReactNode }) => (
      <button type="button">{label}</button>
    ),
  };
});

vi.mock("~/components/primitives/Menu/MenuContext", () => ({
  MenuProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const action: ActionWithChildren = {
  id: "root",
  type: "action",
  variant: "action_with_children",
  name: "Root",
  section: "Root",
  children: [
    {
      id: "child",
      type: "action",
      variant: "action",
      name: "Child",
      section: "Root",
      perform: () => undefined,
    },
  ],
};

describe("ContextMenu", () => {
  test("should keep the trigger but defer menu item creation until open", () => {
    const container = document.createElement("div");

    act(() => {
      ReactDOM.render(
        <ContextMenu action={action} ariaLabel="Options">
          <button type="button">Trigger</button>
        </ContextMenu>,
        container
      );
    });

    expect(container.textContent).toContain("Trigger");
    expect(actionToMenuItem).not.toHaveBeenCalled();

    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
  });
});
