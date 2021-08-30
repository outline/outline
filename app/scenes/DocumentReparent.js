// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import Collection from "models/Collection";
import Document from "models/Document";
import Button from "components/Button";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";
import { type NavigationNode } from "types";

type Props = {
  document: Document,
  item: {|
    active: ?boolean,
    children: Array<NavigationNode>,
    collectionId: void | string,
    collectionName: void | string,
    depth: number,
    id: string,
    permission: void | "read" | "read_write",
    title: string,
    url: string,
  |},
  collection: Collection,
  onSubmit: () => void,
};

function DocumentReparent({ document, collection, item, onSubmit }: Props) {
  const [isSaving, setIsSaving] = useState();
  const { showToast } = useToasts();
  const { documents } = useStores();
  const { t } = useTranslation();

  const accessMapping = {
    read_write: t("View and edit"),
    read: t("View only"),
    null: t("No access"),
  };

  const handleSubmit = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      setIsSaving(true);

      try {
        documents.move(item.id, collection.id);
        showToast(t("Document moved"), {
          type: "info",
        });
        onSubmit();
      } catch (err) {
        showToast(err.message, { type: "error" });
      } finally {
        setIsSaving(false);
      }
    },
    [documents, item.id, collection.id, showToast, t, onSubmit]
  );

  return (
    <Flex column>
      <form onSubmit={handleSubmit}>
        <HelpText>
          <Trans
            defaults="Moving document <em>{{titleWithDefault}}</em> from collection <em>{{ prevCollection }}</em> of access <em>{{ prevPermission }}</em> to collection <em> {{newCollection}} </em> of access <em>{{ newPermission }}</em> will change permission level of the document."
            values={{
              titleWithDefault: item.title,
              prevCollection: item.collectionName,
              newCollection: collection.name,
              prevPermission: accessMapping[item.permission || "null"],
              newPermission: accessMapping[collection.permission || "null"],
            }}
            components={{ em: <strong /> }}
          />
        </HelpText>
        <Button type="submit">
          {isSaving ? `${t("Moving")}…` : t("Move document")}
        </Button>
      </form>
    </Flex>
  );
}

export default observer(DocumentReparent);
