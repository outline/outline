import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useRouteMatch } from "react-router-dom";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import CommentThread from "./CommentThread";
import Sidebar from "./RightSidebar";

function Comments() {
  const { ui, comments, documents } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const match = useRouteMatch<{ documentSlug: string }>();
  const document = documents.getByUrl(match.params.documentSlug);

  if (!team.commenting || !document) {
    return null;
  }

  return (
    <Sidebar title={t("Comments")} onClose={ui.collapseComments} id="comments">
      {comments.threadsInDocument(document.id).map((comment) => (
        <CommentThread key={comment.id} comment={comment} document={document} />
      ))}
    </Sidebar>
  );
}

export default observer(Comments);
