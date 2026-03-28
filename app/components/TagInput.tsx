import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import useStores from "~/hooks/useStores";
import type Tag from "~/models/Tag";
import { TagList } from "./TagList";

interface Props {
  /** The document being tagged. */
  documentId: string;
  /** Current tags on the document. */
  tags: Tag[] | undefined;
  /** Whether the current user can edit tags. */
  canUpdate: boolean;
}

function TagInput({ documentId, tags, canUpdate }: Props) {
  const { tags: tagsStore, documents } = useStores();
  const { t } = useTranslation();
  const [inputValue, setInputValue] = React.useState("");
  const [typedValue, setTypedValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<Tag[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  React.useEffect(() => {
    if (!canUpdate || tagsStore.isLoaded) {
      return;
    }
    void (async () => {
      let offset = 0;
      const limit = 100;
      while (true) {
        const batch = await tagsStore.fetchPage({ offset, limit });
        if (batch.length < limit) {
          break;
        }
        offset += limit;
      }
    })();
  }, [tagsStore, canUpdate]);

  // Hydrate document.tags from the server on mount if not yet loaded.
  React.useEffect(() => {
    const document = documents.get(documentId);
    if (document && document.tags == null) {
      void documents.fetch(documentId, { force: true });
    }
  }, [documents, documentId]);

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      setTypedValue(value);
      setHighlightedIndex(-1);

      if (value.trim()) {
        const normalizedInput = value.trim().toLowerCase();
        const existingIds = new Set((tags ?? []).map((tag) => tag.id));
        const matched = tagsStore.orderedData
          .filter(
            (tag) =>
              tag.name.includes(normalizedInput) && !existingIds.has(tag.id)
          )
          .slice(0, 8);
        setSuggestions(matched);
        setIsOpen(true);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    },
    [tags, tagsStore]
  );

  const handleAddTag = React.useCallback(
    async (nameOrTag: string | Tag) => {
      const name =
        typeof nameOrTag === "string" ? nameOrTag.trim() : nameOrTag.name;
      if (!name) {
        return;
      }
      const tag = await tagsStore.createTag(name);
      await tagsStore.addToDocument(tag.id, documentId);
      const document = documents.get(documentId);
      if (document && !(document.tags ?? []).find((t) => t.id === tag.id)) {
        document.tags = [...(document.tags ?? []), tag];
      }
      setInputValue("");
      setTypedValue("");
      setSuggestions([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [tagsStore, documents, documentId]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (suggestions.length > 0) {
          const next = Math.min(highlightedIndex + 1, suggestions.length - 1);
          setHighlightedIndex(next);
          setInputValue(suggestions[next].name);
        }
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (highlightedIndex > 0) {
          const prev = highlightedIndex - 1;
          setHighlightedIndex(prev);
          setInputValue(suggestions[prev].name);
        } else if (highlightedIndex === 0) {
          setHighlightedIndex(-1);
          setInputValue(typedValue);
        }
        return;
      }

      if (e.key === "Enter" && inputValue.trim()) {
        e.preventDefault();
        const selected =
          highlightedIndex >= 0
            ? suggestions[highlightedIndex]
            : suggestions.length > 0
              ? suggestions[0]
              : inputValue;
        void handleAddTag(selected);
        return;
      }

      if (e.key === "Escape") {
        setIsOpen(false);
        setInputValue("");
        setTypedValue("");
        setHighlightedIndex(-1);
      }
    },
    [inputValue, typedValue, highlightedIndex, suggestions, handleAddTag]
  );

  const handleRemove = React.useCallback(
    (tag: Tag) => {
      void tagsStore.removeFromDocument(tag.id, documentId);
      const document = documents.get(documentId);
      if (document) {
        document.tags = (document.tags ?? []).filter((t) => t.id !== tag.id);
      }
    },
    [tagsStore, documents, documentId]
  );

  return (
    <Container>
      <TagList tags={tags} onRemove={canUpdate ? handleRemove : undefined} />
      {canUpdate && (
        <InputWrapper>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={(tags ?? []).length === 0 ? t("Add a tag…") : undefined}
            aria-label={t("Add tag")}
            onBlur={() =>
              setTimeout(() => {
                setIsOpen(false);
                setHighlightedIndex(-1);
                setInputValue(typedValue);
              }, 150)
            }
          />
          {isOpen && (
            <Dropdown>
              {suggestions.map((tag, index) => (
                <SuggestionItem
                  key={tag.id}
                  highlighted={index === highlightedIndex}
                  onMouseEnter={() => {
                    setHighlightedIndex(index);
                    setInputValue(tag.name);
                  }}
                  onMouseLeave={() => {
                    setHighlightedIndex(-1);
                    setInputValue(typedValue);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void handleAddTag(tag);
                  }}
                >
                  #{tag.name}
                </SuggestionItem>
              ))}
              {typedValue.trim() &&
                !suggestions.find(
                  (s) => s.name === typedValue.trim().toLowerCase()
                ) && (
                  <SuggestionItem
                    highlighted={highlightedIndex === suggestions.length}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      void handleAddTag(typedValue);
                    }}
                  >
                    {t(`Create "{{name}}"`, {
                      name: typedValue.trim().toLowerCase(),
                    })}
                  </SuggestionItem>
                )}
            </Dropdown>
          )}
        </InputWrapper>
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
`;

const Dropdown = styled.ul`
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  background: ${({ theme }) => theme.menuBackground};
  border: 1px solid ${({ theme }) => theme.divider};
  border-radius: 4px;
  padding: 4px 0;
  min-width: 160px;
  list-style: none;
  margin: 0;
  box-shadow: ${({ theme }) => theme.menuShadow};
`;

const SuggestionItem = styled.li<{ highlighted?: boolean }>`
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  background: ${({ highlighted, theme }) =>
    highlighted ? theme.listItemHoverBackground : "transparent"};

  &:hover {
    background: ${({ theme }) => theme.listItemHoverBackground};
  }
`;

/**
 * Inline tag editor below the document title. Renders existing tags as
 * dismissible pills and an input with typeahead autocomplete.
 */
export default observer(TagInput);
