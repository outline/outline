import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useRouteMatch } from "react-router-dom";
import { TeamPreference } from "@shared/types";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import CommentThread from "./CommentThread";
import Sidebar from "./SidebarLayout";

function Comments() {
  const { ui, comments, documents } = useStores();
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const match = useRouteMatch<{ documentSlug: string }>();
  const document = documents.getByUrl(match.params.documentSlug);
  console.log({ comments, document });

  if (!team.getPreference(TeamPreference.Commenting) || !document) {
    return null;
  }

  return (
    <Sidebar title={t("Comments")} onClose={ui.collapseComments}>
      <div>
        {comments.threadsInDocument(document.id).map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            document={document}
          />
        ))}
      </div>
    </Sidebar>
  );
}

export default observer(Comments);
