import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { homePath } from "~/utils/routeHelpers";

type Props = {
  collection: Collection;
  onSubmit: () => void;
};

function CollectionDelete({ collection, onSubmit }: Props) {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const team = useCurrentTeam();
  const { showToast } = useToasts();
  const { ui } = useStores();
  const history = useHistory();
  const { t } = useTranslation();
  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsDeleting(true);

      try {
        const redirect = collection.id === ui.activeCollectionId;
        await collection.delete();
        onSubmit();
        if (redirect) {
          history.push(homePath());
        }
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [collection, history, onSubmit, showToast, ui.activeCollectionId]
  );

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <Text type="secondary">
          <Trans
            defaults="Are you sure about that? Deleting the <em>{{collectionName}}</em> collection is permanent and cannot be restored, however documents within will be moved to the trash."
            values={{
              collectionName: collection.name,
            }}
            components={{
              em: <strong />,
            }}
          />
        </Text>
        {team.defaultCollectionId === collection.id ? (
          <Text type="secondary">
            <Trans
              defaults="Also, <em>{{collectionName}}</em> is being used as the start view – deleting it will reset the start view to the Home page."
              values={{
                collectionName: collection.name,
              }}
              components={{
                em: <strong />,
              }}
            />
          </Text>
        ) : null}
        <Button type="submit" disabled={isDeleting} autoFocus danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(CollectionDelete);
