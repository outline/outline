import { observer } from "mobx-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation, useRouteMatch } from "react-router-dom";
import { toast } from "sonner";
import { UserPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import CenteredContent from "~/components/CenteredContent";
import Flex from "~/components/Flex";
import PlaceholderNote from "~/components/PlaceholderNote";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { preloadEditor } from "~/routes/scenes";
import { noteEditPath, notePath } from "~/utils/routeHelpers";
function NoteNew() {
  const history = useHistory();
  const location = useLocation();
  const query = useQuery();
  const user = useCurrentUser();
  const match = useRouteMatch<{
    notebookSlug?: string;
  }>();
  const { t } = useTranslation();
  const { notes, notebooks, userMemberships, groupMemberships } = useStores();
  const id = match.params.notebookSlug || query.get("collectionId");
  useEffect(() => {
    // Download the editor while the document is being created on the server
    preloadEditor();
    async function createNote() {
      const index = parseInt(query.get("index") || "0", 10);
      const parentNoteId = query.get("parentDocumentId") ?? undefined;
      const parentNote = parentNoteId ? notes.get(parentNoteId) : undefined;
      let notebook;
      try {
        if (id) {
          notebook = await notebooks.fetch(id);
        }
        const note = await notes.create(
          {
            notebookId: notebook?.id,
            parentNoteId,
            fullWidth:
              parentNote?.fullWidth ||
              user.getPreference(UserPreference.FullWidthNotes),
            templateId: query.get("templateId") ?? undefined,
            title: query.get("title") ?? "",
            data: ProsemirrorDataHelper.getEmpty(),
          },
          {
            publish: notebook?.id || parentNoteId ? true : undefined,
            index,
          }
        );
        if (parentNoteId) {
          userMemberships.getByNoteId(note.id)?.addNote(note, parentNoteId);
          groupMemberships.getByNoteId(note.id)?.addNote(note, parentNoteId);
        }
        history.replace(
          !user.separateEditMode ? notePath(note) : noteEditPath(note),
          location.state
        );
      } catch (_err) {
        toast.error(t("Couldn’t create the document, try again?"));
        history.goBack();
      }
    }
    void createNote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Flex column auto>
      <CenteredContent>
        <PlaceholderNote />
      </CenteredContent>
    </Flex>
  );
}
export default observer(NoteNew);
