import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import TeamLogo from "~/components/TeamLogo";
import {
  ActionSeparator,
  createActionGroup,
  createInternalLinkAction,
} from "~/actions";
import { NoteSection } from "~/actions/sections";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { useMenuAction } from "~/hooks/useMenuAction";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { newTemplatePath } from "~/utils/routeHelpers";
import { AvatarSize } from "~/components/Avatar";
function NewTemplateMenu() {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const { notebooks, policies } = useStores();
  const can = usePolicy(team);
  const notebookActions = useMemo(
    () =>
      notebooks.orderedData.map((notebook) => {
        const canNotebook = policies.abilities(notebook.id);
        return createInternalLinkAction({
          name: notebook.name,
          section: NoteSection,
          icon: <CollectionIcon notebook={notebook} />,
          visible: !!canNotebook.createTemplate,
          to: newTemplatePath(notebook.id),
        });
      }),
    [policies, notebooks.orderedData]
  );
  const allActions = useMemo(
    () => [
      createInternalLinkAction({
        name: t("Save in workspace"),
        section: NoteSection,
        icon: <TeamLogo model={team} size={AvatarSize.Small} />,
        visible: can.createTemplate,
        to: newTemplatePath(),
      }),
      ActionSeparator,
      createActionGroup({
        name: t("Choose a notebook"),
        actions: notebookActions,
      }),
    ],
    [t, team, can, notebookActions]
  );
  const rootAction = useMenuAction(allActions);
  useEffect(() => {
    void notebooks.fetchPage({
      limit: 100,
    });
  }, [notebooks]);
  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("New template")}>
      <Button icon={<PlusIcon />}>{t("New template")}…</Button>
    </DropdownMenu>
  );
}
export default observer(NewTemplateMenu);
