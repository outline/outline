import isTextInput from "./isTextInput";

// ARIA roles for widgets that implement their own keyboard interaction, such as
// arrow key navigation, typeahead, or dismissal. Focus usually sits on a
// descendant of the widget, so ancestors are checked as well.
// https://www.w3.org/WAI/ARIA/apg/patterns/
const widgetRoles = [
  "menu",
  "menubar",
  "listbox",
  "combobox",
  "tree",
  "treegrid",
  "grid",
  "dialog",
  "alertdialog",
  "radiogroup",
  "slider",
  "spinbutton",
];

const widgetSelector = widgetRoles.map((role) => `[role="${role}"]`).join(",");

/**
 * Checks whether the given event target is, or is contained by, a control that
 * handles its own keyboard input – a text input, or a widget such as a menu,
 * listbox, or dialog. Global keyboard shortcuts should not fire while such a
 * control holds focus, otherwise they compete with it for the same keys.
 *
 * @param target the event target to check.
 * @returns true if the target handles its own keyboard input.
 */
export function isKeyboardWidget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return isTextInput(target) || !!target.closest(widgetSelector);
}
