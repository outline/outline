import { NewDocumentIcon, ShapesIcon } from "outline-icons";
import { useEffect, useMemo } from "react";
import Icon from "@shared/components/Icon";
import { createAction } from "~/actions";
import {
  ActiveCollectionSection,
  DocumentSection,
  TeamSection,
} from "~/actions/sections";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import { newDocumentPath } from "~/utils/routeHelpers";

const useTemplatesAction = () => {
  const { documents } = useStores();

  useEffect(() => {
    void documents.fetchAllTemplates();
  }, [documents]);

  const actions = useMemo(
    () =>
      documents.templatesAlphabetical.map((template) =>
        createAction({
          name: template.titleWithDefault,
          analyticsName: "New document",
          section: template.isWorkspaceTemplate
            ? TeamSection
            : ActiveCollectionSection,
          icon: template.icon ? (
            <Icon value={template.icon} color={template.color ?? undefined} />
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
          perform: ({ activeCollectionId, sidebarContext }) =>
            history.push(
              newDocumentPath(template.collectionId ?? activeCollectionId, {
                templateId: template.id,
              }),
              {
                sidebarContext,
              }
            ),
        })
      ),
    [documents.templatesAlphabetical]
  );

  const newFromTemplate = useMemo(
    () =>
      createAction({
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
        children: () => actions,
      }),
    [actions]
  );

  return newFromTemplate;
};

export default useTemplatesAction;
