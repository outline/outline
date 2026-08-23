import { debounce } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useMemo, useRef, useCallback, useEffect, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { richExtensions } from "@shared/editor/nodes";
import { s } from "@shared/styles";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import { NotebookValidation } from "@shared/validations";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
import Editor from "~/components/Editor";
import LoadingIndicator from "~/components/LoadingIndicator";
import Text from "~/components/Text";
import { MeasuredContainer } from "~/components/MeasuredContainer";
import { withUIExtensions } from "~/editor/extensions";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type { Properties } from "~/types";
import CodeWordBreak from "@shared/editor/extensions/CodeWordBreak";
const extensions = [CodeWordBreak, ...withUIExtensions(richExtensions)];
type Props = {
  notebook: Notebook;
  readOnly?: boolean;
};
function Overview({ notebook, readOnly }: Props) {
  const { notes, notebooks } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const can = usePolicy(notebook);
  const handleSave = useMemo(
    () =>
      debounce(async (getValue) => {
        try {
          await notebook.save({
            data: getValue(false),
          });
        } catch (err) {
          toast.error(t("Sorry, an error occurred saving the notebook"));
          throw err;
        }
      }, 1000),
    [notebook, t]
  );
  useEffect(
    () => () => {
      void handleSave.flush();
    },
    [handleSave]
  );
  const childRef = useRef<HTMLDivElement>(null);
  const childOffsetHeight = childRef.current?.offsetHeight || 0;
  const editorStyle = useMemo(
    () => ({
      padding: "0 32px",
      margin: "0 -32px",
      paddingBottom: `calc(30vh - ${childOffsetHeight}px)`,
    }),
    [childOffsetHeight]
  );
  const onCreateLink = useCallback(
    async (params: Properties<Note>) => {
      const newNote = await notes.create(
        {
          notebookId: notebook.id,
          data: ProsemirrorDataHelper.getEmpty(),
          ...params,
        },
        {
          publish: true,
        }
      );
      return newNote.url;
    },
    [notebook, notes]
  );
  return (
    <>
      {notebooks.isSaving && <LoadingIndicator />}
      {(can.update || readOnly) && (
        <Suspense fallback={<Placeholder>Loading…</Placeholder>}>
          <MeasuredContainer name="document">
            <Editor
              defaultValue={notebook.data}
              onChange={handleSave}
              placeholder={`${t("Add a description")}…`}
              extensions={extensions}
              maxLength={NotebookValidation.maxDescriptionLength}
              onCreateLink={onCreateLink}
              canUpdate={can.update}
              readOnly={!can.update || readOnly}
              userId={user?.id}
              editorStyle={editorStyle}
            />
            <div ref={childRef} />
          </MeasuredContainer>
        </Suspense>
      )}
    </>
  );
}
const Placeholder = styled(Text)`
  color: ${s("placeholder")};
  cursor: text;
  min-height: 27px;
`;
export default observer(Overview);
