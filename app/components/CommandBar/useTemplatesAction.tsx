import { NewDocumentIcon, ShapesIcon } from "outline-icons";
import { useEffect, useMemo } from "react";
import Icon from "@shared/components/Icon";
import { createActionWithChildren, createInternalLinkAction } from "~/actions";
import {
  ActiveNotebookSection,
  NoteSection,
  TeamSection,
} from "~/actions/sections";
import useStores from "~/hooks/useStores";
import { newNotePath } from "~/utils/routeHelpers";
const useTemplatesAction = () => {
  const { templates } = useStores();
  useEffect(() => {
    void templates.fetchAll();
  }, [templates]);
  const actions = useMemo(
    () =>
      templates.alphabetical.map((template) =>
        createInternalLinkAction({
          name: template.titleWithDefault,
          analyticsName: "New document",
          section: template.isWorkspaceTemplate
            ? TeamSection
            : ActiveNotebookSection,
          icon: template.icon ? (
            <Icon
              value={template.icon}
              initial={template.initial}
              color={template.color ?? undefined}
            />
          ) : (
            <NewDocumentIcon />
          ),
          keywords: "create",
          visible: ({ currentTeamId, activeNotebookId, stores }) => {
            if (activeNotebookId) {
              return (
                stores.policies.abilities(activeNotebookId).createNote &&
                (template.notebookId === activeNotebookId ||
                  template.isWorkspaceTemplate)
              );
            }
            return (
              !!currentTeamId &&
              stores.policies.abilities(currentTeamId).createNote &&
              template.isWorkspaceTemplate
            );
          },
          to: ({ activeNotebookId, sidebarContext }) => {
            const [pathname, search] = newNotePath(
              template.notebookId ?? activeNotebookId,
              {
                templateId: template.id,
              }
            ).split("?");
            return {
              pathname,
              search,
              state: { sidebarContext },
            };
          },
        })
      ),
    [templates.alphabetical]
  );
  const newFromTemplate = useMemo(
    () =>
      createActionWithChildren({
        id: "templates",
        name: ({ t }) => t("New from template"),
        placeholder: ({ t }) => t("Choose a template"),
        section: NoteSection,
        icon: <ShapesIcon />,
        visible: ({ currentTeamId, activeNotebookId, stores }) => {
          if (activeNotebookId) {
            return stores.policies.abilities(activeNotebookId).createNote;
          }
          return (
            !!currentTeamId &&
            stores.policies.abilities(currentTeamId).createNote
          );
        },
        children: actions,
      }),
    [actions]
  );
  return newFromTemplate;
};
export default useTemplatesAction;
