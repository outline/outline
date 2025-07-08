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
  createRootMenuAction,
} from "~/actions";
import { DocumentSection } from "~/actions/sections";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { newTemplatePath } from "~/utils/routeHelpers";

function NewTemplateMenu() {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { collections, policies } = useStores();
  const can = usePolicy(team);

  const collectionActions = collections.orderedData.map((collection) => {
    const canCollection = policies.abilities(collection.id);
    return createInternalLinkActionV2({
      name: collection.name,
      section: DocumentSection,
      icon: <CollectionIcon collection={collection} />,
      visible: !!canCollection.createDocument,
      to: newTemplatePath(collection.id),
    });
  });

  const allActions = [
    createInternalLinkActionV2({
      name: t("Save in workspace"),
      section: DocumentSection,
      icon: <TeamLogo model={team} />,
      visible: can.createTemplate,
      to: newTemplatePath(),
    }),
    createActionV2Separator(),
    createActionV2Group({
      name: t("Choose a collection"),
      actions: collectionActions,
    }),
  ];

  const rootAction = createRootMenuAction(allActions);

  useEffect(() => {
    void collections.fetchPage({
      limit: 100,
    });
  }, [collections]);

  return (
    <DropdownMenu
      action={rootAction}
      align="end"
      triggerAriaLabel={t("New template")}
    >
      <Button icon={<PlusIcon />}>{t("New template")}…</Button>
    </DropdownMenu>
  );
}

export default observer(NewTemplateMenu);
