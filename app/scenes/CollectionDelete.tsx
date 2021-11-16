import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import Collection from "models/Collection";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import useToasts from "hooks/useToasts";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/routeHelpers' or its cor... Remove this comment to see the full error message
import { homePath } from "utils/routeHelpers";

type Props = {
  collection: Collection;
  onSubmit: () => void;
};

function CollectionDelete({ collection, onSubmit }: Props) {
  const [isDeleting, setIsDeleting] = React.useState();
  const { showToast } = useToasts();
  const history = useHistory();
  const { t } = useTranslation();
  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'true' is not assignable to param... Remove this comment to see the full error message
      setIsDeleting(true);

      try {
        await collection.delete();
        history.push(homePath());
        onSubmit();
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      } finally {
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'false' is not assignable to para... Remove this comment to see the full error message
        setIsDeleting(false);
      }
    },
    [showToast, onSubmit, collection, history]
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
        <Button type="submit" disabled={isDeleting} autoFocus danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(CollectionDelete);
