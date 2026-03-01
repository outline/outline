import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { useDocumentContext } from "~/components/DocumentContext";
import Flex from "~/components/Flex";
import TagBadge from "~/components/TagBadge";
import TagInput from "~/components/TagInput";
import Text from "~/components/Text";
import useKeyDown from "~/hooks/useKeyDown";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import Sidebar from "./SidebarLayout";

function Tags() {
	const { ui } = useStores();
	const { document } = useDocumentContext();
	const { t } = useTranslation();
	const can = usePolicy(document);

	useKeyDown("Escape", () => ui.set({ tagsExpanded: false }));

	if (!document) {
		return null;
	}

	const handleClose = () => ui.set({ tagsExpanded: false });

	return (
		<Sidebar title={t("Tags")} onClose={handleClose}>
			<Wrapper column gap={12}>
				<Text as="p" type="secondary" size="small">
					{t(
						"Tags help organise and find documents across your workspace."
					)}
				</Text>
				{can.update ? (
					<TagInput document={document} />
				) : (
					<TagList wrap gap={4}>
						{(document.tags ?? []).length === 0 ? (
							<Text type="tertiary" size="small">
								{t("No tags")}
							</Text>
						) : (
							(document.tags ?? []).map((tag) => (
								<TagBadge key={tag.id} name={tag.name} color={tag.color} />
							))
						)}
					</TagList>
				)}
			</Wrapper>
		</Sidebar>
	);
}

const Wrapper = styled(Flex)`
	padding: 12px 16px;
`;

const TagList = styled(Flex)`
	flex-wrap: wrap;
`;

export default observer(Tags);
