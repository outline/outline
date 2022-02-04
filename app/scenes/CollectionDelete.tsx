import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import HelpText from "~/components/HelpText";
import useCurrentTeam from "~/hooks/useCurrentTeam";
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
  const history = useHistory();
  const { t } = useTranslation();
  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsDeleting(true);

      try {
        await collection.delete();
        onSubmit();
        history.push(homePath());
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [collection, history, onSubmit, showToast]
  );

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <HelpText>
          <Trans
            defaults="Are you sure about that? Deleting the <em>{{collectionName}}</em> collection is permanent and cannot be restored, however documents within will be moved to the trash."
            values={{
              collectionName: collection.name,
            }}
            components={{
              em: <strong />,
            }}
          />
        </HelpText>
        {team.defaultCollectionId === collection.id ? (
          <HelpText>
            <Trans
              defaults="Also, <em>{{collectionName}}</em> is being used as a Default Collection. Deleting it will reset the Default Collection to Home page."
              values={{
                collectionName: collection.name,
              }}
              components={{
                em: <strong />,
              }}
            />
          </HelpText>
        ) : null}
        <Button type="submit" disabled={isDeleting} autoFocus danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(CollectionDelete);
