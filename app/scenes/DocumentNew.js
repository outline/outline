// @flow
import { observer } from "mobx-react";
import queryString from "query-string";
import * as React from "react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation, useRouteMatch } from "react-router-dom";
import CenteredContent from "components/CenteredContent";
import Flex from "components/Flex";
import LoadingPlaceholder from "components/LoadingPlaceholder";
import useStores from "hooks/useStores";
import { editDocumentUrl } from "utils/routeHelpers";

function DocumentNew() {
  const history = useHistory();
  const location = useLocation();
  const match = useRouteMatch();
  const { t } = useTranslation();
  const { documents, ui, collections } = useStores();

  useEffect(() => {
    async function createDocument() {
      const params = queryString.parse(location.search);
      try {
        const collection = await collections.fetch(match.params.id || "");
        const document = await documents.create({
          collectionId: collection.id,
          parentDocumentId: params.parentDocumentId,
          templateId: params.templateId,
          template: params.template,
          title: "",
          text: "",
        });
        history.replace(editDocumentUrl(document));
      } catch (err) {
        ui.showToast(t("Couldn’t create the document, try again?"), {
          type: "error",
        });
        history.goBack();
      }
    }
    createDocument();
  });

  return (
    <Flex column auto>
      <CenteredContent>
        <LoadingPlaceholder />
      </CenteredContent>
    </Flex>
  );
}

export default observer(DocumentNew);
