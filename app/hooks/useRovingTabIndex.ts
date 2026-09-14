import {
  useFocusEffect,
  useRovingTabIndex as useRovingTabIndexBase,
} from "@getoutline/react-roving-tabindex";

/**
 * Registers an element with the surrounding roving tabindex group and focuses
 * it when the group makes it the active item.
 *
 * @param ref A ref to the element to register.
 * @param disabled Whether the group should skip the element.
 * @returns the props to spread onto the element.
 */
export function useRovingTabIndex(
  ref: React.RefObject<HTMLElement | null>,
  disabled: boolean
) {
  // The package types predate React 19, where a ref created with a null
  // initial value is typed as nullable.
  const nonNullableRef = ref as React.RefObject<HTMLElement>;
  const { focused, ...rest } = useRovingTabIndexBase(nonNullableRef, disabled);
  useFocusEffect(focused, nonNullableRef);
  return { focused, ...rest };
}
