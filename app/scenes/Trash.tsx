import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import EmptyTrashMenu from "~/menus/EmptyTrashMenu";

function Trash() {
  const { t } = useTranslation();
  const { documents } = useStores();
  const user = useCurrentUser();

  return (
    <Scene
      icon={<TrashIcon color="currentColor" />}
      title={t("Trash")}
      actions={
        user.isAdmin && (
          <Action>
            <EmptyTrashMenu />
          </Action>
        )
      }
    >
      <Heading>{t("Trash")}</Heading>
      <PaginatedDocumentList
        documents={documents.deleted}
        fetch={documents.fetchDeleted}
        heading={<Subheading sticky>{t("Documents")}</Subheading>}
        empty={<Empty>{t("Trash is empty at the moment.")}</Empty>}
        showCollection
        showTemplate
      />
    </Scene>
  );
}

export default observer(Trash);
