import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useHistory } from "react-router-dom";
import Group from "~/models/Group";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import HelpText from "~/components/HelpText";
import useToasts from "~/hooks/useToasts";
import { groupSettingsPath } from "~/utils/routeHelpers";

type Props = {
  group: Group;
  onSubmit: () => void;
};

function GroupDelete({ group, onSubmit }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const history = useHistory();
  const [isDeleting, setIsDeleting] = React.useState();

  const handleSubmit = async (ev: React.SyntheticEvent) => {
    ev.preventDefault();
    // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'true' is not assignable to param... Remove this comment to see the full error message
    setIsDeleting(true);

    try {
      await group.delete();
      history.push(groupSettingsPath());
      onSubmit();
    } catch (err) {
      showToast(err.message, {
        type: "error",
      });
    } finally {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'false' is not assignable to para... Remove this comment to see the full error message
      setIsDeleting(false);
    }
  };

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <HelpText>
          <Trans
            defaults="Are you sure about that? Deleting the <em>{{groupName}}</em> group will cause its members to lose access to collections and documents that it is associated with."
            values={{
              groupName: group.name,
            }}
            components={{
              em: <strong />,
            }}
          />
        </HelpText>
        <Button type="submit" danger>
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string |
          HTMLCollection' is not assignable t... Remove this comment to see the
          full error message
          {isDeleting ? `${t("Deleting")}…` : t("I’m sure – Delete")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(GroupDelete);
