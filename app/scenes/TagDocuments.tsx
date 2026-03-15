import { observer } from "mobx-react";
import { HashtagIcon } from "outline-icons";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import useStores from "~/hooks/useStores";

function TagDocuments() {
	const { t } = useTranslation();
	const { tagName } = useParams<{ tagName: string }>();
	const { documents } = useStores();

	const decodedTagName = decodeURIComponent(tagName);

	const handleFetch = useCallback(
		(options?: Record<string, unknown>) =>
			documents.fetchByTag(decodedTagName, options),
		[documents, decodedTagName]
	);

	return (
		<Scene icon={<HashtagIcon />} title={decodedTagName}>
			<Heading>
				<HashtagIcon size={28} />
				{decodedTagName}
			</Heading>
			<PaginatedDocumentList
				empty={
					<Empty>{t("No documents with this tag yet.")}</Empty>
				}
				fetch={handleFetch}
				documents={documents.byTag(decodedTagName)}
				showCollection
			/>
		</Scene>
	);
}

export default observer(TagDocuments);
