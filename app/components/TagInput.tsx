import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import { toast } from "sonner";
import styled from "styled-components";
import { isMac } from "@shared/utils/browser";
import { errToString } from "@shared/utils/error";
import { TagValidation } from "@shared/validations";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type Tag from "~/models/Tag";
import type { TagSelection } from "~/utils/tagInput";
import {
  buildTagOptions,
  initialTagInputState,
  isUndoShortcut,
  resolveTagSelection,
  tagInputReducer,
  takeRestorableTag,
  validateTagName,
} from "~/utils/tagInput";
import { TagList } from "./TagList";

interface Props {
  /** The document being tagged. */
  documentId: string;
  /** Current tags on the document. */
  tags: Tag[] | undefined;
  /** Whether the current user can edit tags, false when read only. */
  canUpdate: boolean;
  /** Ref to the text input, used to move focus into the tag field. */
  inputRef?: React.Ref<HTMLInputElement>;
}

function TagInput({ documentId, tags, canUpdate, inputRef }: Props) {
  const { tags: tagsStore, documents } = useStores();
  const { t } = useTranslation();
  const [state, dispatch] = React.useReducer(
    tagInputReducer,
    initialTagInputState
  );
  const isSubmittingRef = React.useRef(false);
  const localInputRef = React.useRef<HTMLInputElement>(null);
  // Tags removed from this document in this session, oldest first, so that
  // the undo shortcut can restore them.
  const removedRef = React.useRef<Tag[]>([]);
  React.useEffect(() => {
    removedRef.current = [];
  }, [documentId]);
  const listboxId = `tag-input-${React.useId()}`;
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const document = documents.get(documentId);
  const team = useCurrentTeam();
  const canCreate = !!usePolicy(team).createTag;

  React.useEffect(() => {
    if (canUpdate) {
      void tagsStore.fetchAllIfNeeded().catch((err) => {
        toast.error(errToString(err));
      });
    }
  }, [tagsStore, canUpdate]);

  // Documents carry their tags from every API payload, only fetch when this
  // one was loaded without them.
  const isMissingTags = !!document && document.tagIds === undefined;
  React.useEffect(() => {
    if (isMissingTags) {
      void documents.fetch(documentId, { force: true });
    }
  }, [documents, documentId, isMissingTags]);

  const appliedIds = new Set((tags ?? []).map((tag) => tag.id));
  const findByName = (name: string) => tagsStore.getByName(name);
  const options = buildTagOptions(
    tagsStore.orderedData,
    state.value,
    appliedIds,
    findByName,
    { canCreate }
  );
  const error = validateTagName(state.value);
  const errorMessage =
    error === "invalid"
      ? t(
          "Tags must include a letter or number and can only contain letters, numbers, hyphens and underscores"
        )
      : error === "tooLong"
        ? t("Tags can be at most {{ max }} characters", {
            max: TagValidation.maxNameLength,
          })
        : undefined;
  const isListOpen = state.isOpen && options.length > 0;
  const activeIndex =
    isListOpen && state.highlightedIndex < options.length
      ? state.highlightedIndex
      : -1;

  // Keep the keyboard-highlighted option visible in the scrollable list.
  React.useEffect(() => {
    if (activeIndex >= 0) {
      window.document
        .getElementById(optionId(activeIndex))
        ?.scrollIntoView({ block: "nearest" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  const handleSelect = async (selection: TagSelection) => {
    if (selection.type === "none") {
      dispatch({ type: "reset" });
      return;
    }
    if (
      selection.type === "invalid" ||
      selection.type === "unknown" ||
      isSubmittingRef.current
    ) {
      return;
    }
    isSubmittingRef.current = true;
    try {
      const tag =
        selection.type === "create"
          ? await tagsStore.createTag(selection.name)
          : selection.tag;
      await tagsStore.addToDocument(tag.id, documentId);
      dispatch({ type: "reset" });
    } catch (err) {
      toast.error(errToString(err));
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (!state.value && isUndoShortcut(e.nativeEvent, isMac)) {
      const { tag, rest } = takeRestorableTag(removedRef.current, appliedIds);
      if (tag) {
        e.preventDefault();
        removedRef.current = rest;
        void tagsStore.addToDocument(tag.id, documentId).catch((err) => {
          removedRef.current.push(tag);
          toast.error(errToString(err));
        });
      }
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      dispatch({
        type: "move",
        delta: e.key === "ArrowDown" ? 1 : -1,
        optionCount: options.length,
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      void handleSelect(
        resolveTagSelection({
          value: state.value,
          highlightedIndex: activeIndex,
          options,
          appliedIds,
          findByName,
          canCreate,
        })
      );
      return;
    }

    if (e.key === "Escape" && state.value) {
      e.stopPropagation();
      dispatch({ type: "escape" });
    }
  };

  const handleRemove = (tag: Tag) => {
    removedRef.current.push(tag);
    // The pill's button unmounts, keep focus in the field so undo works.
    localInputRef.current?.focus();
    void tagsStore.removeFromDocument(tag.id, documentId).catch((err) => {
      removedRef.current = removedRef.current.filter((t) => t !== tag);
      toast.error(errToString(err));
    });
  };

  return (
    <Container dir={document?.dir}>
      <TagList tags={tags} onRemove={canUpdate ? handleRemove : undefined} />
      {canUpdate && (
        <InputWrapper>
          <Input
            ref={mergeRefs([localInputRef, inputRef])}
            type="text"
            role="combobox"
            autoComplete="off"
            spellCheck={false}
            value={state.value}
            onChange={(e) =>
              dispatch({ type: "change", value: e.target.value })
            }
            onKeyDown={handleKeyDown}
            onBlur={() => dispatch({ type: "close" })}
            placeholder={
              (tags ?? []).length === 0 ? t("Add a tag…") : undefined
            }
            aria-label={t("Add tag")}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={isListOpen}
            aria-controls={isListOpen ? listboxId : undefined}
            aria-activedescendant={
              activeIndex >= 0 ? optionId(activeIndex) : undefined
            }
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={errorMessage ? `${listboxId}-error` : undefined}
          />
          {isListOpen && (
            <Dropdown id={listboxId} role="listbox" aria-label={t("Tags")}>
              {options.map((option, index) => (
                <SuggestionItem
                  key={option.type === "tag" ? option.tag.id : "create"}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  $active={index === activeIndex}
                  onMouseMove={() => {
                    if (index !== activeIndex) {
                      dispatch({ type: "highlight", index });
                    }
                  }}
                  // Keep focus in the input so blur doesn't close the list
                  // before the click lands.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    void handleSelect(
                      resolveTagSelection({
                        value: state.value,
                        highlightedIndex: index,
                        options,
                        appliedIds,
                        findByName,
                        canCreate,
                      })
                    )
                  }
                >
                  {option.type === "tag"
                    ? `#${option.tag.name}`
                    : t(`Create "{{name}}"`, { name: option.name })}
                </SuggestionItem>
              ))}
            </Dropdown>
          )}
        </InputWrapper>
      )}
      {canUpdate && errorMessage && (
        <ErrorMessage id={`${listboxId}-error`} role="alert">
          {errorMessage}
        </ErrorMessage>
      )}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  margin-bottom: 8px;
`;

const InputWrapper = styled.div`
  position: relative;
`;

const Input = styled.input`
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: ${({ theme }) => theme.textSecondary};
  width: 120px;

  &::placeholder {
    color: ${({ theme }) => theme.placeholder};
  }

  &:focus-visible {
    box-shadow: 0 1px 0 0 ${({ theme }) => theme.accent};
  }
`;

const Dropdown = styled.ul`
  position: absolute;
  top: 100%;
  inset-inline-start: 0;
  z-index: 100;
  background: ${({ theme }) => theme.menuBackground};
  border: 1px solid ${({ theme }) => theme.divider};
  border-radius: 4px;
  padding: 4px 0;
  min-width: 160px;
  list-style: none;
  margin: 0;
  box-shadow: ${({ theme }) => theme.menuShadow};
  max-height: 320px;
  overflow-y: auto;
`;

const SuggestionItem = styled.li<{ $active: boolean }>`
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  background: ${({ $active, theme }) =>
    $active ? theme.listItemHoverBackground : "transparent"};
  border-inline-start: 2px solid
    ${({ $active, theme }) => ($active ? theme.accent : "transparent")};
`;

const ErrorMessage = styled.div`
  flex-basis: 100%;
  width: 100%;
  padding-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: ${({ theme }) => theme.danger};
`;

/**
 * Inline tag editor below the document title. Renders existing tags as
 * dismissible pills and an input with typeahead autocomplete.
 */
export default observer(TagInput);
