import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import type Document from "~/models/Document";
import type Tag from "~/models/Tag";
import Flex from "~/components/Flex";
import TagBadge from "~/components/TagBadge";
import useStores from "~/hooks/useStores";

const TAG_MAX_LENGTH = 64;

interface Props {
	/** The document to manage tags for. */
	document: Document;
}

/**
 * An inline tag editor for the document sidebar. Shows assigned tags as
 * removable badges, lists all available workspace tags as one-click suggestions,
 * and provides a filtered autocomplete input to add or create tags.
 */
function TagInput({ document }: Props) {
	const { tags } = useStores();
	const { t } = useTranslation();
	const [inputValue, setInputValue] = React.useState("");
	const [isAdding, setIsAdding] = React.useState(false);
	const [focused, setFocused] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const wrapperRef = React.useRef<HTMLDivElement>(null);

	const docTags = document.tags ?? [];
	const docTagIds = new Set(docTags.map((t) => t.id));

	const allTags = tags.orderedData;

	const unassignedTags = allTags.filter((t) => !docTagIds.has(t.id));

	const filtered = inputValue.trim()
		? unassignedTags.filter((t) =>
				t.name.includes(inputValue.trim().toLowerCase())
			)
		: unassignedTags;

	const showInput = inputValue.trim().length > 0;
	const showCreateOption =
		showInput &&
		!allTags.some((t) => t.name === inputValue.trim().toLowerCase()) &&
		inputValue.trim().length <= TAG_MAX_LENGTH;

	const addTag = React.useCallback(
		async (tag: Tag) => {
			if (docTagIds.has(tag.id)) {
				return;
			}
			setIsAdding(true);
			try {
				await tags.addToDocument(document.id, tag.id);
				setInputValue("");
				inputRef.current?.focus();
			} catch (err) {
				toast.error(err.message);
			} finally {
				setIsAdding(false);
			}
		},
		[docTagIds, tags, document.id]
	);

	const createAndAdd = React.useCallback(
		async (name: string) => {
			const trimmed = name.trim().toLowerCase();
			if (!trimmed || trimmed.length > TAG_MAX_LENGTH) {
				if (trimmed.length > TAG_MAX_LENGTH) {
					toast.error(
						t("Tag names cannot exceed {{ count }} characters", {
							count: TAG_MAX_LENGTH,
						})
					);
				}
				return;
			}
			setIsAdding(true);
			try {
				let tag = tags.orderedData.find((t) => t.name === trimmed);
				if (!tag) {
					tag = await tags.create({ name: trimmed } as Partial<Tag>);
				}
				await tags.addToDocument(document.id, tag.id);
				setInputValue("");
				inputRef.current?.focus();
			} catch (err) {
				toast.error(err.message);
			} finally {
				setIsAdding(false);
			}
		},
		[tags, document.id, t]
	);

	const handleKeyDown = React.useCallback(
		async (ev: React.KeyboardEvent<HTMLInputElement>) => {
			if (ev.key !== "Enter" && ev.key !== ",") {
				return;
			}
			ev.preventDefault();
			const name = inputValue.trim().toLowerCase();
			if (!name) {
				return;
			}
			const existing = tags.orderedData.find((t) => t.name === name);
			if (existing && !docTagIds.has(existing.id)) {
				await addTag(existing);
			} else if (!existing) {
				await createAndAdd(name);
			} else {
				setInputValue("");
			}
		},
		[inputValue, tags, docTagIds, addTag, createAndAdd]
	);

	const handleRemove = React.useCallback(
		async (tagId: string) => {
			try {
				await tags.removeFromDocument(document.id, tagId);
			} catch (err) {
				toast.error(err.message);
			}
		},
		[tags, document.id]
	);

	React.useEffect(() => {
		if (!tags.isLoaded) {
			void tags.fetchPage();
		}
	}, [tags]);

	return (
		<Wrapper column gap={8} ref={wrapperRef}>
			{docTags.length > 0 && (
				<TagList wrap gap={4}>
					{docTags.map((tag) => (
						<TagBadge
							key={tag.id}
							name={tag.name}
							color={tag.color}
							onRemove={() => handleRemove(tag.id)}
						/>
					))}
				</TagList>
			)}

			<InputWrapper>
				<StyledInput
					ref={inputRef}
					type="text"
					maxLength={TAG_MAX_LENGTH}
					value={inputValue}
					onChange={(ev) => setInputValue(ev.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => setFocused(true)}
					onBlur={() => setTimeout(() => setFocused(false), 150)}
					placeholder={isAdding ? `${t("Adding")}…` : t("Add a tag (press Enter)")}
					disabled={isAdding}
					aria-label={t("Add tag")}
				/>
				{focused && showInput && (filtered.length > 0 || showCreateOption) && (
					<Dropdown>
						{filtered.map((tag) => (
							<DropdownItem
								key={tag.id}
								onMouseDown={(ev) => {
									ev.preventDefault();
									void addTag(tag);
								}}
							>
								<DropDot $color={tag.color ?? null} />
								{tag.name}
							</DropdownItem>
						))}
						{showCreateOption && (
							<DropdownItem
								onMouseDown={(ev) => {
									ev.preventDefault();
									void createAndAdd(inputValue);
								}}
							>
								<CreateLabel>
									{t('Create "{{ name }}"', {
										name: inputValue.trim().toLowerCase(),
									})}
								</CreateLabel>
							</DropdownItem>
						)}
					</Dropdown>
				)}
			</InputWrapper>

			{unassignedTags.length > 0 && (
				<SuggestionsSection column gap={6}>
					<SuggestionsLabel>{t("Available tags")}</SuggestionsLabel>
					<TagList wrap gap={4}>
						{unassignedTags.map((tag) => (
							<SuggestionChip
								key={tag.id}
								$color={tag.color ?? null}
								onClick={() => void addTag(tag)}
								disabled={isAdding}
								type="button"
								title={t("Add tag {{ name }}", { name: tag.name })}
							>
								<DropDot $color={tag.color ?? null} />
								{tag.name}
							</SuggestionChip>
						))}
					</TagList>
				</SuggestionsSection>
			)}
		</Wrapper>
	);
}

const Wrapper = styled(Flex)`
	padding: 4px 0;
`;

const TagList = styled(Flex)`
	flex-wrap: wrap;
`;

const InputWrapper = styled.div`
	position: relative;
	width: 100%;
`;

const StyledInput = styled.input`
	border: 1px solid ${s("inputBorder")};
	border-radius: 4px;
	background: ${s("background")};
	color: ${s("text")};
	font-size: 13px;
	padding: 4px 8px;
	outline: none;
	width: 100%;

	&::placeholder {
		color: ${s("placeholder")};
	}

	&:focus {
		border-color: ${s("inputBorderFocused")};
	}

	&:disabled {
		opacity: 0.6;
	}
`;

const Dropdown = styled.div`
	position: absolute;
	top: calc(100% + 4px);
	left: 0;
	right: 0;
	background: ${s("menuBackground")};
	border: 1px solid ${s("inputBorder")};
	border-radius: 4px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
	z-index: 100;
	max-height: 180px;
	overflow-y: auto;
`;

const DropdownItem = styled.div`
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 10px;
	font-size: 13px;
	cursor: pointer;
	color: ${s("text")};

	&:hover {
		background: ${s("listItemHoverBackground")};
	}
`;

const DropDot = styled.span<{ $color: string | null }>`
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
	background: ${({ $color }) => $color ?? "currentColor"};
	opacity: ${({ $color }) => ($color ? 1 : 0.4)};
`;

const CreateLabel = styled.span`
	font-style: italic;
	color: ${s("textSecondary")};
`;

const SuggestionsSection = styled(Flex)`
	margin-top: 2px;
`;

const SuggestionsLabel = styled.span`
	font-size: 11px;
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: ${s("textTertiary")};
`;

const SuggestionChip = styled.button<{ $color: string | null }>`
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 8px 2px 6px;
	border-radius: 10px;
	font-size: 12px;
	font-weight: 500;
	line-height: 1.5;
	cursor: pointer;
	white-space: nowrap;
	border: 1px dashed
		${({ $color, theme }) => $color ?? theme.inputBorder};
	background: transparent;
	color: ${s("textSecondary")};
	transition: background 100ms ease;

	&:hover:not(:disabled) {
		background: ${({ $color, theme }) =>
			$color ? `${$color}22` : theme.listItemHoverBackground};
		border-style: solid;
	}

	&:disabled {
		opacity: 0.5;
		cursor: default;
	}
`;

export default observer(TagInput);
