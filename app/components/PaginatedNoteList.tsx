import * as React from "react";
import { useTranslation } from "react-i18next";
import type Note from "~/models/Note";
import NoteListItem from "~/components/NoteListItem";
import NoteSelectionToolbar from "~/components/NoteSelectionToolbar";
import Error from "~/components/List/Error";
import { ModelSelectionProvider } from "~/components/ModelSelectionContext";
import PaginatedList from "~/components/PaginatedList";
import useStores from "~/hooks/useStores";
type Props = {
  notes: Note[];
  // oxlint-disable-next-line no-explicit-any
  fetch: (options: Record<string, any>) => Promise<Note[] | undefined>;
  // oxlint-disable-next-line no-explicit-any
  options?: Record<string, any>;
  heading?: React.ReactNode;
  empty?: JSX.Element;
  showParentNotes?: boolean;
  showNotebook?: boolean;
  showPublished?: boolean;
  showDraft?: boolean;
  showTemplate?: boolean;
};
const PaginatedNoteList = React.memo<Props>(function PaginatedNoteList({
  empty,
  heading,
  notes,
  fetch,
  options,
  showParentNotes,
  showNotebook,
  showPublished,
  showTemplate,
  showDraft,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const { policies } = useStores();
  // Only updatable notes are selectable, so that is what feeds range and
  // select-all; per-item checkboxes are gated on the same ability.
  const itemIds = React.useMemo(
    () =>
      notes
        .filter((note) => policies.abilities(note.id).update)
        .map((note) => note.id),
    [notes, policies]
  );
  return (
    <ModelSelectionProvider items={itemIds} toolbar={<NoteSelectionToolbar />}>
      <PaginatedList<Note>
        aria-label={t("Documents")}
        items={notes}
        empty={empty}
        heading={heading}
        fetch={fetch}
        options={options}
        renderError={(props) => <Error {...props} />}
        renderItem={(item, _index) => (
          <NoteListItem
            key={item.id}
            note={item}
            showParentNotes={showParentNotes}
            showNotebook={showNotebook}
            showPublished={showPublished}
            showDraft={showDraft}
          />
        )}
        {...rest}
      />
    </ModelSelectionProvider>
  );
});
export default PaginatedNoteList;
