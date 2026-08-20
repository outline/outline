import { SidebarSection } from "@shared/types";
import {
  moveSidebarSection,
  normalizeSidebarSectionOrder,
} from "./sidebarSections";

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

  it("should move a section to the first position", () => {
    expect(moveSidebarSection(order, Collections, null)).toEqual([
      Collections,
      Starred,
      SharedWithMe,
    ]);
  });

  it("should move a section after another section", () => {
    expect(moveSidebarSection(order, Starred, SharedWithMe)).toEqual([
      SharedWithMe,
      Starred,
      Collections,
    ]);
  });

  it("should return undefined when moving a section after itself", () => {
    expect(moveSidebarSection(order, Starred, Starred)).toBeUndefined();
  });

  it("should return undefined when the order is unchanged", () => {
    expect(moveSidebarSection(order, Starred, null)).toBeUndefined();
    expect(moveSidebarSection(order, SharedWithMe, Starred)).toBeUndefined();
  });
});
