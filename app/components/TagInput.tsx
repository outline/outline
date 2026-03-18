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
  tags: Tag[];
  /** Whether the current user can edit tags. */
  canUpdate: boolean;
}

function TagInput({ documentId, tags, canUpdate }: Props) {
  const { tags: tagsStore, documents } = useStores();
  const { t } = useTranslation();
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<Tag[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    void tagsStore.fetchPage();
  }, [tagsStore]);

  // Hydrate document.tags from the server on mount if not yet populated.
  React.useEffect(() => {
    const document = documents.get(documentId);
    if (document && document.tags.length === 0) {
      void documents.fetch(documentId, { force: true });
    }
  }, [documents, documentId]);

  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      if (value.trim()) {
        const normalizedInput = value.trim().toLowerCase();
        const existingIds = new Set(tags.map((tag) => tag.id));
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
      if (document && !document.tags.find((t) => t.id === tag.id)) {
        document.tags = [...document.tags, tag];
      }
      setInputValue("");
      setSuggestions([]);
      setIsOpen(false);
    },
    [tagsStore, documents, documentId]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && inputValue.trim()) {
        e.preventDefault();
        void handleAddTag(inputValue);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setInputValue("");
      }
    },
    [inputValue, handleAddTag]
  );

  const handleRemove = React.useCallback(
    (tag: Tag) => {
      void tagsStore.removeFromDocument(tag.id, documentId);
      const document = documents.get(documentId);
      if (document) {
        document.tags = document.tags.filter((t) => t.id !== tag.id);
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
            placeholder={tags.length === 0 ? t("Add a tag…") : undefined}
            aria-label={t("Add tag")}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          />
          {isOpen && (
            <Dropdown>
              {suggestions.map((tag) => (
                <SuggestionItem
                  key={tag.id}
                  onMouseDown={() => void handleAddTag(tag)}
                >
                  #{tag.name}
                </SuggestionItem>
              ))}
              {inputValue.trim() &&
                !suggestions.find(
                  (s) => s.name === inputValue.trim().toLowerCase()
                ) && (
                  <SuggestionItem
                    onMouseDown={() => void handleAddTag(inputValue)}
                  >
                    {t(`Create "{{name}}"`, {
                      name: inputValue.trim().toLowerCase(),
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

const SuggestionItem = styled.li`
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background: ${({ theme }) => theme.listItemHoverBackground};
  }
`;

/**
 * Inline tag editor below the document title. Renders existing tags as
 * dismissible pills and an input with typeahead autocomplete.
 */
export default observer(TagInput);
