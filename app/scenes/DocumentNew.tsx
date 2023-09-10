import { observer } from "mobx-react";
import * as React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation, useRouteMatch } from "react-router-dom";
import CenteredContent from "~/components/CenteredContent";
import Flex from "~/components/Flex";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import { documentEditPath, documentPath } from "~/utils/routeHelpers";

type Props = {
  // If true, the document will be created as a template.
  template?: boolean;
};

function DocumentNew({ template }: Props) {
  const history = useHistory();
  const location = useLocation();
  const query = useQuery();
  const user = useCurrentUser();
  const match = useRouteMatch<{ id?: string }>();
  const { t } = useTranslation();
  const { documents, collections } = useStores();
  const { showToast } = useToasts();
  const id = match.params.id || query.get("collectionId");

  useEffect(() => {
    async function createDocument() {
      const parentDocumentId = query.get("parentDocumentId") ?? undefined;
      const parentDocument = parentDocumentId
        ? documents.get(parentDocumentId)
        : undefined;
      let collection;

      try {
        if (id) {
          collection = await collections.fetch(id);
        }
        const document = await documents.create({
          collectionId: collection?.id,
          parentDocumentId,
          fullWidth: parentDocument?.fullWidth,
          templateId: query.get("templateId") ?? undefined,
          template,
          title: "",
          text: "",
        });
        history.replace(
          template || !user.separateEditMode
            ? documentPath(document)
            : documentEditPath(document),
          location.state
        );
      } catch (err) {
        showToast(t("Couldn’t create the document, try again?"), {
          type: "error",
        });
        history.goBack();
      }
    }

    void createDocument();
  });

  return (
    <Flex column auto>
      <CenteredContent>
        <PlaceholderDocument />
      </CenteredContent>
    </Flex>
  );
}

export default observer(DocumentNew);
