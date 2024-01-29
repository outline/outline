import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import Group from "~/models/Group";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import { settingsPath } from "~/utils/routeHelpers";

type Props = {
  group: Group;
  onSubmit: () => void;
};

function GroupDelete({ group, onSubmit }: Props) {
  const { t } = useTranslation();
  const history = useHistory();

  const handleSubmit = async () => {
    await group.delete();
    history.push(settingsPath("groups"));
    onSubmit();
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("I’m sure – Delete")}
      savingText={`${t("Deleting")}…`}
      danger
    >
      <Trans
        defaults="Are you sure about that? Deleting the <em>{{groupName}}</em> group will cause its members to lose access to collections and documents that it is associated with."
        values={{
          groupName: group.name,
        }}
        components={{
          em: <strong />,
        }}
      />
    </ConfirmationDialog>
  );
}

export default observer(GroupDelete);
