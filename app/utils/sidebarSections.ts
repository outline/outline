import { SidebarSection } from "@shared/types";

/**
 * Normalizes a persisted sidebar section order — unknown values are removed
 * and missing sections are appended in their default order.
 *
 * @param saved The persisted section order, if any.
 * @returns the full list of sidebar sections in display order.
 */
export function normalizeSidebarSectionOrder(
  saved?: SidebarSection[]
): SidebarSection[] {
  const all = Object.values(SidebarSection);
  const valid = (saved ?? []).filter((section) => all.includes(section));
  return [...valid, ...all.filter((section) => !valid.includes(section))];
}

/**
 * Computes the sidebar section order after moving a section to a new position.
 *
 * @param order The current section order.
 * @param section The section being moved.
 * @param after The section to place it after, or null to place it first.
 * @returns the new order, or undefined when the move would not change it.
 */
export function moveSidebarSection(
  order: SidebarSection[],
  section: SidebarSection,
  after: SidebarSection | null
): SidebarSection[] | undefined {
  if (section === after) {
    return undefined;
  }

  const result = order.filter((s) => s !== section);
  const index = after ? result.indexOf(after) + 1 : 0;
  result.splice(index, 0, section);

  return result.every((s, i) => s === order[i]) ? undefined : result;
}
