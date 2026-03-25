import { observer } from "mobx-react";
import { HashtagIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type Document from "~/models/Document";
import Flex from "~/components/Flex";
import TagBadge from "~/components/TagBadge";
import Text from "~/components/Text";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/primitives/Popover";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import TagInput from "~/components/TagInput";
import NudeButton from "~/components/NudeButton";
import { s } from "@shared/styles";

interface Props {
	document: Document;
	editable?: boolean;
}

function DocumentTagsBar({ document, editable = true }: Props) {
	const { t } = useTranslation();
	const { tags: tagsStore } = useStores();
	const can = usePolicy(document);
	const [open, setOpen] = React.useState(false);
	const [removingTagId, setRemovingTagId] = React.useState<string | null>(null);
	const tags = React.useMemo(() => {
		const seen = new Set<string>();
		return (document.tags ?? []).filter((tag) => {
			const key = tag.id ?? tag.name.toLowerCase();
			if (seen.has(key)) {
				return false;
			}
			seen.add(key);
			return true;
		});
	}, [document.tags]);
	const canEdit = editable && can.update;

	const handleRemove = React.useCallback(
		async (tagId: string) => {
			if (removingTagId === tagId) {
				return;
			}
			setRemovingTagId(tagId);
			try {
				await tagsStore.removeFromDocument(document.id, tagId);
			} finally {
				setRemovingTagId((current) => (current === tagId ? null : current));
			}
		},
		[document.id, removingTagId, tagsStore]
	);

	if (!tags.length && !canEdit) {
		return null;
	}

	return (
		<Container column gap={8}>
			<Row align="center" gap={8}>
				{canEdit ? (
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger>
							<TriggerButton
								type="button"
								aria-label={tags.length ? t("Manage tags") : t("Add tag")}
							>
								<HashtagIcon size={14} />
								<Text type="tertiary" size="small">
									{t("Tags")}
								</Text>
								<PlusIcon size={14} />
							</TriggerButton>
						</PopoverTrigger>
						<PopoverContent
							align="start"
							side="bottom"
							width={360}
							onOpenAutoFocus={(event) => event.preventDefault()}
						>
							<TagInput document={document} />
						</PopoverContent>
					</Popover>
				) : (
					<Label align="center" gap={4}>
						<HashtagIcon size={14} />
						<Text type="tertiary" size="small">
							{t("Tags")}
						</Text>
					</Label>
				)}
				<TagList>
					{tags.length ? (
						tags.map((tag, index) => (
							<TagBadge
								key={tag.id ?? `${tag.name}-${index}`}
								name={tag.name}
								color={tag.color}
								onRemove={canEdit && tag.id ? () => handleRemove(tag.id) : undefined}
								removeOnHover={canEdit}
							/>
						))
					) : (
						<EmptyLabel type="tertiary" size="small">
							{t("No tags")}
						</EmptyLabel>
					)}
				</TagList>
			</Row>
		</Container>
	);
}

const Container = styled(Flex)`
	margin: -1.5em 0 2em;
`;

const Row = styled(Flex)`
	flex-wrap: wrap;
`;

const Label = styled(Flex)`
	color: ${s("textTertiary")};
	flex-shrink: 0;
`;

const TagList = styled.div`
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 4px;
	min-height: 24px;
	flex: 1;
`;

const EmptyLabel = styled(Text)`
	font-style: italic;
`;

const TriggerButton = styled(NudeButton)`
	display: inline-flex;
	align-items: center;
	gap: 4px;
	width: auto;
	height: auto;
	padding: 2px 8px;
	border-radius: 12px;
	color: ${s("textSecondary")};
	background: ${s("sidebarHoverBackground")};
	flex-shrink: 0;
	line-height: 1;

	&:hover,
	&:focus-visible {
		background: ${s("listItemHoverBackground")};
	}
`;

export default observer(DocumentTagsBar);
