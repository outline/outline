import { TagValidation } from "@shared/validations";
import { normalizeTagName } from "@shared/utils/TagHelper";
import type Tag from "~/models/Tag";

/** Why a tag name was rejected. */
export type TagNameError = "empty" | "tooLong" | "invalid";

/** A row in the tag input's suggestion list. */
export type TagOption =
  | { type: "tag"; tag: Tag }
  | { type: "create"; name: string };

/** What submitting the tag input should do. */
export type TagSelection =
  | { type: "attach"; tag: Tag }
  | { type: "create"; name: string }
  | { type: "invalid"; error: TagNameError }
  /** A name matching no tag, typed by a user who cannot create tags. */
  | { type: "unknown" }
  | { type: "none" };

export interface TagInputState {
  /** The text typed into the input. */
  value: string;
  /** Index of the highlighted option, -1 when the typed text is active. */
  highlightedIndex: number;
  /** Whether the suggestion list is shown. */
  isOpen: boolean;
}

export type TagInputAction =
  | { type: "change"; value: string }
  | { type: "move"; delta: 1 | -1; optionCount: number }
  | { type: "highlight"; index: number }
  | { type: "close" }
  | { type: "escape" }
  | { type: "reset" };

export const initialTagInputState: TagInputState = {
  value: "",
  highlightedIndex: -1,
  isOpen: false,
};

/**
 * Validates a raw tag name with the same rules as the server.
 *
 * @param raw the name as typed.
 * @returns the reason the name is rejected, or undefined when it is valid.
 */
export function validateTagName(raw: string): TagNameError | undefined {
  const name = normalizeTagName(raw);
  if (!name) {
    return "empty";
  }
  if (name.length > TagValidation.maxNameLength) {
    return "tooLong";
  }
  if (!TagValidation.nameRegex.test(name)) {
    return "invalid";
  }
  return undefined;
}

/**
 * Builds the suggestion list for the typed text: matching tags that are not
 * applied yet, names starting with the text first, followed by a row to create
 * the typed tag when it is valid and no tag has that name. An empty field lists
 * every tag not applied yet.
 *
 * @param tags all known tags, in display order.
 * @param value the typed text.
 * @param appliedIds ids of the tags already on the document.
 * @param findByName looks up a known tag by its normalized name.
 * @param options.canCreate whether to offer creating the typed tag.
 * @param options.maxSuggestions the maximum number of matching tags to include.
 * @returns the options to show.
 */
export function buildTagOptions(
  tags: Tag[],
  value: string,
  appliedIds: Set<string>,
  findByName: (name: string) => Tag | undefined,
  {
    canCreate = true,
    maxSuggestions = 8,
  }: { canCreate?: boolean; maxSuggestions?: number } = {}
): TagOption[] {
  const query = normalizeTagName(value);
  if (!query) {
    // Browsing with an empty field lists every tag that can still be applied.
    return tags
      .filter((tag) => !appliedIds.has(tag.id))
      .map((tag) => ({ type: "tag", tag }));
  }

  const matches = tags.filter(
    (tag) => !appliedIds.has(tag.id) && tag.name.includes(query)
  );
  const options: TagOption[] = [
    ...matches.filter((tag) => tag.name.startsWith(query)),
    ...matches.filter((tag) => !tag.name.startsWith(query)),
  ]
    .slice(0, maxSuggestions)
    .map((tag) => ({ type: "tag", tag }));

  if (canCreate && !validateTagName(query) && !findByName(query)) {
    options.push({ type: "create", name: query });
  }
  return options;
}

/**
 * State transitions of the tag input. Arrow keys move between the typed text
 * (-1) and the options, including the create row, without wrapping.
 *
 * @param state the current state.
 * @param action the action to apply.
 * @returns the next state.
 */
export function tagInputReducer(
  state: TagInputState,
  action: TagInputAction
): TagInputState {
  switch (action.type) {
    case "change":
      return {
        value: action.value,
        highlightedIndex: -1,
        isOpen: !!action.value.trim(),
      };
    case "move": {
      if (action.optionCount === 0) {
        return state;
      }
      if (!state.isOpen) {
        return action.delta > 0
          ? { ...state, isOpen: true, highlightedIndex: 0 }
          : state;
      }
      const highlightedIndex = Math.max(
        -1,
        Math.min(state.highlightedIndex + action.delta, action.optionCount - 1)
      );
      return { ...state, highlightedIndex };
    }
    case "highlight":
      return { ...state, highlightedIndex: action.index };
    case "close":
      return { ...state, isOpen: false, highlightedIndex: -1 };
    case "escape":
      return state.isOpen
        ? { ...state, isOpen: false, highlightedIndex: -1 }
        : initialTagInputState;
    case "reset":
      return initialTagInputState;
    default:
      return state;
  }
}

/**
 * Decides what submitting the input does: the highlighted option wins,
 * otherwise the typed text attaches the tag with that name when one exists,
 * and creates it when it doesn't. Existing tags are never re-created.
 *
 * @param params the typed text, highlighted option, current options, applied
 * tag ids, a lookup of known tags by normalized name, and whether the user can
 * create tags.
 * @returns the selection to act on.
 */
export function resolveTagSelection({
  value,
  highlightedIndex,
  options,
  appliedIds,
  findByName,
  canCreate = true,
}: {
  value: string;
  highlightedIndex: number;
  options: TagOption[];
  appliedIds: Set<string>;
  findByName: (name: string) => Tag | undefined;
  canCreate?: boolean;
}): TagSelection {
  const highlighted = options[highlightedIndex];
  if (highlighted?.type === "tag") {
    return { type: "attach", tag: highlighted.tag };
  }
  if (highlighted?.type === "create") {
    return { type: "create", name: highlighted.name };
  }

  const error = validateTagName(value);
  if (error === "empty") {
    return { type: "none" };
  }
  if (error) {
    return { type: "invalid", error };
  }

  const name = normalizeTagName(value);
  const existing = findByName(name);
  if (existing) {
    return appliedIds.has(existing.id)
      ? { type: "none" }
      : { type: "attach", tag: existing };
  }
  return canCreate ? { type: "create", name } : { type: "unknown" };
}
