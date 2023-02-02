import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { TeamPreference } from "@shared/types";
import Comment from "~/models/Comment";
import Flex from "~/components/Flex";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import CommentForm from "./CommentForm";
import CommentThread from "./CommentThread";
import Sidebar from "./SidebarLayout";

function Comments() {
  const { ui, comments, documents } = useStores();
  const [newComment] = React.useState(new Comment({}, comments));
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const match = useRouteMatch<{ documentSlug: string }>();
  const document = documents.getByUrl(match.params.documentSlug);

  if (!team.getPreference(TeamPreference.Commenting) || !document) {
    return null;
  }

  return (
    <Sidebar title={t("Comments")} onClose={ui.collapseComments}>
      {comments
        .threadsInDocument(document.id)
        .filter((thread) => !thread.isNew || thread.createdById === user.id)
        .map((comment) => (
          <CommentThread
            key={comment.id}
            comment={comment}
            document={document}
          />
        ))}
      <Flex />
      <NewCommentForm
        documentId={document.id}
        thread={newComment}
        placeholder={`${t("Add a comment")}…`}
      />
    </Sidebar>
  );
}

const NewCommentForm = styled(CommentForm)`
  margin: 12px;
`;

export default observer(Comments);
