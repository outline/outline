// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { groupSettings } from "shared/utils/routeHelpers";
import Group from "models/Group";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import useStores from "hooks/useStores";

type Props = {|
  group: Group,
  onSubmit: () => void,
|};

function GroupDelete({ group, onSubmit }: Props) {
  const { ui } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const [isDeleting, setIsDeleting] = React.useState();

  const handleSubmit = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    setIsDeleting(true);

    try {
      await group.delete();
      history.push(groupSettings());
      onSubmit();
    } catch (err) {
      ui.showToast(err.message, { type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <HelpText>
          <Trans
            defaults="Are you sure about that? Deleting the <em>{{groupName}}</em> 
            group will cause its members to lose access to collections and documents that it is associated with."
            values={{ groupName: group.name }}
            components={{ em: <strong /> }}
          />
        </HelpText>
        <Button type="submit" danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(GroupDelete);
