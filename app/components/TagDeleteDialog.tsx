import { observer } from "mobx-react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import type Tag from "~/models/Tag";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

interface Props {
	tag: Tag;
	onSubmit?: () => void;
}

function TagDeleteDialog({ tag, onSubmit }: Props) {
	const { tags } = useStores();
	const { t } = useTranslation();

	const handleSubmit = async () => {
		try {
			await tags.delete(tag, { confirm: true });
			onSubmit?.();
		} catch (err) {
			toast.error(err.message);
		}
	};

	return (
		<ConfirmationDialog
			onSubmit={handleSubmit}
			submitText={t("I'm sure – Delete")}
			savingText={`${t("Deleting")}…`}
			danger
		>
			<Text as="p" type="secondary">
				<Trans
					defaults='Are you sure you want to delete the tag <em>{{ name }}</em>? It will be removed from all documents.'
					values={{ name: tag.name }}
					components={{ em: <strong /> }}
				/>
			</Text>
		</ConfirmationDialog>
	);
}

export default observer(TagDeleteDialog);
