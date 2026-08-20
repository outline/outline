import { SidebarSection } from "@shared/types";

// The component's drag-and-drop and store imports cannot load in the unit
// test environment; only the pure ordering helpers are under test.
vi.mock("../hooks/useDragAndDrop", () => ({
  useDragSidebarSection: vi.fn(),
  useDropToReorderSidebarSection: vi.fn(),
}));
vi.mock("~/hooks/useCurrentUser", () => ({ default: vi.fn() }));

import {
  moveSidebarSection,
  normalizeSidebarSectionOrder,
} from "./DraggableSection";

const { Starred, SharedWithMe, Collections } = SidebarSection;

describe("normalizeSidebarSectionOrder", () => {
  it("should return the default order when nothing is saved", () => {
    expect(normalizeSidebarSectionOrder()).toEqual([
      Starred,
      SharedWithMe,
      Collections,
    ]);
  });

  it("should keep the saved order", () => {
    expect(
      normalizeSidebarSectionOrder([Collections, Starred, SharedWithMe])
    ).toEqual([Collections, Starred, SharedWithMe]);
  });

  it("should append sections missing from the saved order", () => {
    expect(normalizeSidebarSectionOrder([Collections])).toEqual([
      Collections,
      Starred,
      SharedWithMe,
    ]);
  });

  it("should remove duplicates from the saved order", () => {
    expect(
      normalizeSidebarSectionOrder([Collections, Starred, Collections])
    ).toEqual([Collections, Starred, SharedWithMe]);
  });

  it("should remove unknown sections from the saved order", () => {
    expect(
      normalizeSidebarSectionOrder([
        "unknown" as SidebarSection,
        Collections,
        Starred,
        SharedWithMe,
      ])
    ).toEqual([Collections, Starred, SharedWithMe]);
  });
});

describe("moveSidebarSection", () => {
  const order = [Starred, SharedWithMe, Collections];

  it("should move a section before another section", () => {
    expect(moveSidebarSection(order, Collections, "before", Starred)).toEqual([
      Collections,
      Starred,
      SharedWithMe,
    ]);
  });

  it("should move a section after another section", () => {
    expect(moveSidebarSection(order, Starred, "after", SharedWithMe)).toEqual([
      SharedWithMe,
      Starred,
      Collections,
    ]);
  });

  it("should return undefined when the target is the moved section", () => {
    expect(
      moveSidebarSection(order, Starred, "after", Starred)
    ).toBeUndefined();
    expect(
      moveSidebarSection(order, Starred, "before", Starred)
    ).toBeUndefined();
  });

  it("should return undefined when the order is unchanged", () => {
    expect(
      moveSidebarSection(order, Starred, "before", SharedWithMe)
    ).toBeUndefined();
    expect(
      moveSidebarSection(order, SharedWithMe, "after", Starred)
    ).toBeUndefined();
  });
});
