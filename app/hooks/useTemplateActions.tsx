import { NewDocumentIcon, ShapesIcon } from "outline-icons";
import * as React from "react";
import EmojiIcon from "~/components/Icons/EmojiIcon";
import { createAction } from "~/actions";
import { DocumentSection } from "~/actions/sections";
import history from "~/utils/history";
import { newDocumentPath } from "~/utils/routeHelpers";
import useStores from "./useStores";

const useTemplatesActions = () => {
  const { documents } = useStores();

  React.useEffect(() => {
    void documents.fetchTemplates();
  }, [documents]);

  const actions = React.useMemo(
    () =>
      documents.templatesAlphabetical.map((item) =>
        createAction({
          name: item.titleWithDefault,
          analyticsName: "New document",
          section: DocumentSection,
          icon: item.emoji ? (
            <EmojiIcon emoji={item.emoji} />
          ) : (
            <NewDocumentIcon />
          ),
          keywords: "create",
          perform: ({ activeCollectionId, inStarredSection }) =>
            history.push(
              newDocumentPath(item.collectionId ?? activeCollectionId, {
                templateId: item.id,
              }),
              {
                starred: inStarredSection,
              }
            ),
        })
      ),
    [documents.templatesAlphabetical]
  );

  const newFromTemplate = React.useMemo(
    () =>
      createAction({
        id: "templates",
        name: ({ t }) => t("New from template"),
        placeholder: ({ t }) => t("Choose a template"),
        section: DocumentSection,
        icon: <ShapesIcon />,
        visible: ({ currentTeamId, stores }) =>
          !!currentTeamId &&
          stores.policies.abilities(currentTeamId).createDocument,
        children: () => actions,
      }),
    [actions]
  );

  return newFromTemplate;
};

export default useTemplatesActions;
