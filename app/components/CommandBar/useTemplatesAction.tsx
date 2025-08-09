import { NewDocumentIcon, ShapesIcon } from "outline-icons";
import { useEffect, useMemo } from "react";
import Icon from "@shared/components/Icon";
import {
  createActionV2WithChildren,
  createInternalLinkActionV2,
} from "~/actions";
import {
  ActiveCollectionSection,
  DocumentSection,
  TeamSection,
} from "~/actions/sections";
import useStores from "~/hooks/useStores";
import { newDocumentPath } from "~/utils/routeHelpers";

const useTemplatesAction = () => {
  const { documents } = useStores();

  useEffect(() => {
    void documents.fetchAllTemplates();
  }, [documents]);

  const actions = useMemo(
    () =>
      documents.templatesAlphabetical.map((template) =>
        createInternalLinkActionV2({
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
    [documents.templatesAlphabetical]
  );

  const newFromTemplate = useMemo(
    () =>
      createActionV2WithChildren({
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
