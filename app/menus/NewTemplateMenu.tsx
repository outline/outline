import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import TeamLogo from "~/components/TeamLogo";
import {
  ActionSeparator,
  createActionGroup,
  createInternalLinkAction,
} from "~/actions";
import { DocumentSection } from "~/actions/sections";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { useMenuAction } from "~/hooks/useMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { newTemplatePath } from "~/utils/routeHelpers";
import { AvatarSize } from "~/components/Avatar";

function NewTemplateMenu() {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { collections, policies } = useStores();
  const can = usePolicy(team);

  const collectionActions = useMemo(
    () =>
      collections.orderedData.map((collection) => {
        const canCollection = policies.abilities(collection.id);
        return createInternalLinkAction({
          name: collection.name,
          section: DocumentSection,
          icon: <CollectionIcon collection={collection} />,
          visible: !!canCollection.createDocument,
          to: newTemplatePath(collection.id),
        });
      }),
    [policies, collections.orderedData]
  );

  const allActions = useMemo(
    () => [
      createInternalLinkAction({
        name: t("Save in workspace"),
        section: DocumentSection,
        icon: <TeamLogo model={team} size={AvatarSize.Small} />,
        visible: can.createTemplate,
        to: newTemplatePath(),
      }),
      ActionSeparator,
      createActionGroup({
        name: t("Choose a collection"),
        actions: collectionActions,
      }),
    ],
    [t, team, can, collectionActions]
  );

  const rootAction = useMenuAction(allActions);

  useEffect(() => {
    void collections.fetchPage({
      limit: 100,
    });
  }, [collections]);

  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("New template")}>
      <Button icon={<PlusIcon />}>{t("New template")}…</Button>
    </DropdownMenu>
  );
}

export default observer(NewTemplateMenu);
