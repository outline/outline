import { observer } from "mobx-react";
import { StarredIcon } from "outline-icons";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import usePersistedState from "~/hooks/usePersistedState";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import type Tag from "~/models/Tag";
import { tagPath } from "~/utils/routeHelpers";
import { getHeaderExpandedKey } from "./Header";
import Header from "./Header";
import SidebarLink from "./SidebarLink";

function TagColorDot({ tag }: { tag: Tag }) {
	return <ColorDot $color={tag.color ?? null} />;
}

const TagStarButton = observer(function TagStarButton({ tag }: { tag: Tag }) {
	const { tags } = useStores();
	const { t } = useTranslation();
	const theme = useTheme();

	const handleStar = useCallback(
		async (ev: React.MouseEvent) => {
			ev.preventDefault();
			ev.stopPropagation();
			if (tag.isStarred) {
				await tags.unstar(tag);
			} else {
				await tags.star(tag);
			}
		},
		[tag, tags]
	);

	return (
		<Tooltip
			content={tag.isStarred ? t("Unstar") : t("Star")}
			placement="right"
		>
			<StarButton onClick={handleStar} $starred={tag.isStarred}>
				<StarredIcon
					color={tag.isStarred ? theme.yellow : "currentColor"}
					size={18}
				/>
			</StarButton>
		</Tooltip>
	);
});

function TagsLink() {
	const { tags, stars } = useStores();
	const { t } = useTranslation();
	const [expanded] = usePersistedState<boolean>(
		getHeaderExpandedKey("tags"),
		true
	);

	useEffect(() => {
		if (expanded) {
			void tags.fetchPage();
		}
	}, [expanded, tags]);

	const starredTagIds = new Set(
		stars.orderedData
			.filter((s) => s.tagId)
			.map((s) => s.tagId as string)
	);

	const visibleTags = expanded
		? tags.orderedData
		: tags.orderedData.filter((tag) => starredTagIds.has(tag.id));

	if (!visibleTags.length && !expanded) {
		return null;
	}

	if (!tags.orderedData.length && !starredTagIds.size) {
		return null;
	}

	return (
		<Header id="tags" title={t("Tags")}>
			{visibleTags.map((tag) => (
				<SidebarLink
					key={tag.id}
					to={tagPath(tag.name)}
					icon={<TagColorDot tag={tag} />}
					label={tag.name}
					exact
					menu={<TagStarButton tag={tag} />}
				/>
			))}
		</Header>
	);
}

const ColorDot = styled.span<{ $color: string | null }>`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	flex-shrink: 0;

	&::before {
		content: "";
		display: block;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: ${({ $color, theme }) => $color ?? theme.textTertiary};
		opacity: ${({ $color }) => ($color ? 1 : 0.5)};
	}
`;

const StarButton = styled(NudeButton)<{ $starred?: boolean }>`
	opacity: ${({ $starred }) => ($starred ? 1 : 0)};
	transition: opacity 100ms ease-in-out;
	color: ${({ theme }) => theme.textTertiary};
	width: 24px;
	height: 24px;
	flex-shrink: 0;

	&:hover {
		color: ${({ theme }) => theme.text};
	}
`;

export default observer(TagsLink);
