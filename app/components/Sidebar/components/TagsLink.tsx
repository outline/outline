import { observer } from "mobx-react";
import { HashtagIcon } from "outline-icons";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import useStores from "~/hooks/useStores";
import type Tag from "~/models/Tag";
import { tagPath } from "~/utils/routeHelpers";
import Header from "./Header";
import SidebarLink from "./SidebarLink";

function TagColorDot({ tag }: { tag: Tag }) {
	if (!tag.color) {
		return <HashtagIcon />;
	}
	return <ColorDot $color={tag.color} />;
}

function TagsLink() {
	const { tags } = useStores();
	const { t } = useTranslation();

	useEffect(() => {
		void tags.fetchUsage();
	}, [tags]);

	if (!tags.orderedData.length) {
		return null;
	}

	return (
		<Header id="tags" title={t("Tags")}>
			{tags.orderedData.map((tag) => (
				<SidebarLink
					key={tag.id}
					to={tagPath(tag.name)}
					icon={<TagColorDot tag={tag} />}
					label={tag.name}
					exact
				/>
			))}
		</Header>
	);
}

const ColorDot = styled.span<{ $color: string }>`
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
		background: ${({ $color }) => $color};
	}
`;

export default observer(TagsLink);
