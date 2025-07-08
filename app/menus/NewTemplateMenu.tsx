import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import TeamLogo from "~/components/TeamLogo";
import {
  createActionV2Group,
  createActionV2Separator,
  createInternalLinkActionV2,
} from "~/actions";
import { TeamSection } from "~/actions/sections";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import {
  ActionV2Group,
  ActionV2Separator,
  ActionV2Variants,
  InternalLinkActionV2,
} from "~/types";
import { newTemplatePath } from "~/utils/routeHelpers";

function NewTemplateMenu() {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { collections, policies } = useStores();
  const can = usePolicy(team);
  useEffect(() => {
    void collections.fetchPage({
      limit: 100,
    });
  }, [collections]);

  const workspaceAction = can.createTemplate
    ? createInternalLinkActionV2({
        name: t("Save in workspace"),
        section: TeamSection,
        icon: <TeamLogo model={team} />,
        to: newTemplatePath(),
      })
    : undefined;

  const collectionActions = collections.orderedData.reduce(
    (actions, collection) => {
      const can = policies.abilities(collection.id);

      if (can.createDocument) {
        actions.push(
          createInternalLinkActionV2({
            name: collection.name,
            section: TeamSection,
            icon: <CollectionIcon collection={collection} />,
            to: newTemplatePath(collection.id),
          })
        );
      }

      return actions;
    },
    [] as InternalLinkActionV2[]
  );

  const collectionActionGroup = collectionActions.length
    ? createActionV2Group({
        name: t("Choose a collection"),
        actions: collectionActions,
      })
    : undefined;

  const allActions: (ActionV2Variants | ActionV2Group | ActionV2Separator)[] =
    [];

  if (workspaceAction) {
    allActions.push(workspaceAction);
    allActions.push(createActionV2Separator());
  }

  if (collectionActionGroup) {
    allActions.push(collectionActionGroup);
  }

  if (allActions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu
      actions={allActions}
      align="end"
      ariaLabel={t("New template")}
    >
      <Button icon={<PlusIcon />}>{t("New template")}…</Button>
    </DropdownMenu>
  );
}

export default observer(NewTemplateMenu);
