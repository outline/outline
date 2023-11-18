import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import Group from "~/models/Group";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import { settingsPath } from "~/utils/routeHelpers";

type Props = {
  group: Group;
  onSubmit: () => void;
};

function GroupDelete({ group, onSubmit }: Props) {
  const { t } = useTranslation();
  const history = useHistory();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleSubmit = async (ev: React.SyntheticEvent) => {
    ev.preventDefault();
    setIsDeleting(true);

    try {
      await group.delete();
      history.push(settingsPath("groups"));
      onSubmit();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <Text type="secondary">
          <Trans
            defaults="Are you sure about that? Deleting the <em>{{groupName}}</em> group will cause its members to lose access to collections and documents that it is associated with."
            values={{
              groupName: group.name,
            }}
            components={{
              em: <strong />,
            }}
          />
        </Text>
        <Button type="submit" danger>
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(GroupDelete);
