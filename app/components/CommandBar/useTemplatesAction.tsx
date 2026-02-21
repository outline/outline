import { NewDocumentIcon, ShapesIcon } from "outline-icons";
import { useEffect, useMemo } from "react";
import Icon from "@shared/components/Icon";
import { createActionWithChildren, createInternalLinkAction } from "~/actions";
import {
  ActiveCollectionSection,
  DocumentSection,
  TeamSection,
} from "~/actions/sections";
import useStores from "~/hooks/useStores";
import { newDocumentPath } from "~/utils/routeHelpers";

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
            : ActiveCollectionSection,
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
          visible: ({ currentTeamId, activeCollectionId, stores }) => {
            if (activeCollectionId) {
              return (
                stores.policies.abilities(activeCollectionId).createDocument &&
                (template.collectionId === activeCollectionId ||
                  template.isWorkspaceTemplate)
              );
            }
            return (
              !!currentTeamId &&
              stores.policies.abilities(currentTeamId).createDocument &&
              template.isWorkspaceTemplate
            );
          },
          to: ({ activeCollectionId, sidebarContext }) => {
            const [pathname, search] = newDocumentPath(
              template.collectionId ?? activeCollectionId,
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
        section: DocumentSection,
        icon: <ShapesIcon />,
        visible: ({ currentTeamId, activeCollectionId, stores }) => {
          if (activeCollectionId) {
            return stores.policies.abilities(activeCollectionId).createDocument;
          }
          return (
            !!currentTeamId &&
            stores.policies.abilities(currentTeamId).createDocument
          );
        },
        children: actions,
      }),
    [actions]
  );

  return newFromTemplate;
};

export default useTemplatesAction;
