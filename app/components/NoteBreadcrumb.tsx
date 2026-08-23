import type { TFunction } from "i18next";
import { observer } from "mobx-react";
import { ArchiveIcon, GoToIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import { ellipsis } from "@shared/styles";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
import Breadcrumb from "~/components/Breadcrumb";
import Tooltip from "~/components/Tooltip";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { useNotebookMenuAction } from "~/hooks/useNotebookMenuAction";
import { useNoteMenuAction } from "~/hooks/useNoteMenuAction";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { archivePath, trashPath } from "~/utils/routeHelpers";
import { createInternalLinkAction } from "~/actions";
import { ActiveNoteSection } from "~/actions/sections";
/**
 * Returns the breadcrumb parts leading up to a note, separating the
 * (possibly deleted) notebook label from ancestor note titles. The
 * note itself is not included.
 *
 * @param note - the note to compute the breadcrumb for.
 * @param t - translation function for fallback titles.
 * @returns the notebook label and ancestor titles.
 */
export function noteBreadcrumbParts(
  note: Note,
  t: TFunction
): {
  notebook: string | undefined;
  ancestors: string[];
} {
  let notebookLabel: string | undefined;
  if (note.isNotebookDeleted) {
    notebookLabel = t("Deleted Notebook");
  } else if (note.notebook?.name) {
    notebookLabel = note.notebook.name;
  }
  return {
    notebook: notebookLabel,
    ancestors: note.pathTo
      .slice(0, -1)
      .map((node) => node.title || t("Untitled")),
  };
}
/**
 * Returns the breadcrumb path leading up to a note as a plain text
 * string. Includes the notebook name (or "Deleted Notebook" fallback)
 * and any ancestor note titles, slash-separated.
 *
 * @param note - the note to compute the breadcrumb for.
 * @param t - translation function for fallback titles.
 * @returns the breadcrumb as a slash-separated string, or undefined if the
 * note has no resolvable parent context.
 */
export function noteBreadcrumbText(
  note: Note,
  t: TFunction
): string | undefined {
  const parts = noteBreadcrumbParts(note, t);
  const segments = [
    ...(parts.notebook ? [parts.notebook] : []),
    ...parts.ancestors,
  ];
  return segments.length ? segments.join(" / ") : undefined;
}
type Props = {
  children?: React.ReactNode;
  note: Note;
  onlyText?: boolean;
  /**
   * Maximum number of ancestor notes to show, counted back from the
   * note's immediate parent. Any ancestors beyond this depth are replaced
   * with an ellipsis. The notebook is always shown. If undefined, all
   * ancestors are shown. If less than or equal to 0, no items are shown.
   */
  maxDepth?: number;
};
function NoteBreadcrumb(
  { note, children, onlyText, maxDepth }: Props,
  ref: React.RefObject<HTMLDivElement> | null
) {
  const { notebooks } = useStores();
  const { t } = useTranslation();
  const sidebarContext = useLocationSidebarContext();
  const notebook = note.notebookId ? notebooks.get(note.notebookId) : undefined;
  const can = usePolicy(notebook);
  const depth = maxDepth === undefined ? undefined : Math.max(0, maxDepth);
  React.useEffect(() => {
    void note.loadRelations({ withoutPolicies: true });
  }, [note]);
  const path = note.pathTo.slice(0, -1);
  const actions = React.useMemo(() => {
    if (depth === 0) {
      return [];
    }
    // Root items (trash / archive / collection) are always retained so the
    // collection can still be shown when visible, even for small depths.
    const rootActions = [
      createInternalLinkAction({
        name: t("Trash"),
        section: ActiveNoteSection,
        icon: <TrashIcon />,
        visible: note.isDeleted,
        to: trashPath(),
      }),
      createInternalLinkAction({
        name: t("Archive"),
        section: ActiveNoteSection,
        icon: <ArchiveIcon />,
        visible: note.isArchived,
        to: archivePath(),
      }),
      createInternalLinkAction({
        name: notebook ? (
          <NotebookName
            notebook={notebook}
            icon={<CollectionIcon notebook={notebook} expanded />}
          />
        ) : undefined,
        section: ActiveNoteSection,
        visible: !!(notebook && can.readNote),
        to: notebook
          ? {
              pathname: notebook.path,
              state: { sidebarContext },
            }
          : "",
      }),
      createInternalLinkAction({
        name: t("Deleted Notebook"),
        section: ActiveNoteSection,
        visible: note.isNotebookDeleted,
        to: "",
      }),
    ];
    const ancestorActions = path.map((node) => {
      const title = node.title || t("Untitled");
      return createInternalLinkAction({
        name: (
          <NoteName
            noteId={node.id}
            notebook={notebook}
            title={title}
            icon={
              node.icon ? (
                <Icon
                  value={node.icon}
                  color={node.color}
                  initial={title.charAt(0).toUpperCase()}
                />
              ) : undefined
            }
          />
        ),
        section: ActiveNoteSection,
        to: {
          pathname: node.url,
          state: { sidebarContext },
        },
      });
    });
    // Depth is counted back from the note's parent, so keep the ancestors
    // nearest the note.
    return [
      ...rootActions,
      ...(depth !== undefined
        ? ancestorActions.slice(-depth)
        : ancestorActions),
    ];
  }, [t, note, notebook, can.readNote, sidebarContext, path, depth]);
  if (!notebooks.isLoaded) {
    return null;
  }
  if (onlyText) {
    if (depth === 0) {
      return <></>;
    }
    const { notebook: notebookLabel, ancestors: ancestorLabels } =
      noteBreadcrumbParts(note, t);
    // Depth is measured back from the note's parent, so keep the trailing
    // ancestors nearest to the note and collapse anything beyond into an
    // ellipsis. The collection is always shown.
    const tail =
      depth === undefined ? ancestorLabels : ancestorLabels.slice(-depth);
    const omitted = ancestorLabels.slice(
      0,
      ancestorLabels.length - tail.length
    );
    const segments: React.ReactNode[] = [
      ...(notebookLabel ? [notebookLabel] : []),
      ...(omitted.length
        ? [
            <Tooltip key="ellipsis" content={omitted.join(" / ")}>
              <Ellipsis>…</Ellipsis>
            </Tooltip>,
          ]
        : []),
      ...tail,
    ];
    return (
      <>
        {segments.map((label, index) => (
          <React.Fragment key={index}>
            {index !== 0 && <SmallSlash />}
            {label}
          </React.Fragment>
        ))}
      </>
    );
  }
  return (
    <Breadcrumb actions={actions} ref={ref} highlightFirstItem>
      {children}
    </Breadcrumb>
  );
}
/** Renders a collection name and icon wrapped in a context menu. */
const NotebookName = observer(function NotebookName_({
  notebook,
  icon,
}: {
  notebook: Notebook;
  icon?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const menuAction = useNotebookMenuAction({
    notebookId: notebook.id,
  });
  return (
    <ActionContextProvider value={{ activeModels: [notebook] }}>
      <ContextMenu action={menuAction} ariaLabel={t("Notebook options")}>
        <Name>
          {icon}
          <NameText>{notebook.name}</NameText>
        </Name>
      </ContextMenu>
    </ActionContextProvider>
  );
});
/** Renders a note name and icon wrapped in a context menu. */
const NoteName = observer(function NoteName_({
  noteId,
  notebook,
  title,
  icon,
}: {
  noteId: string;
  notebook: Notebook | undefined;
  title: string;
  icon?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { notes } = useStores();
  const doc = notes.get(noteId);
  const menuAction = useNoteMenuAction({ noteId: noteId });
  if (!doc) {
    return (
      <Name>
        {icon}
        <NameText>{title}</NameText>
      </Name>
    );
  }
  return (
    <ActionContextProvider
      value={{
        activeModels: [doc, ...(notebook ? [notebook] : [])],
      }}
    >
      <ContextMenu action={menuAction} ariaLabel={t("Document options")}>
        <Name>
          {icon}
          <NameText>{title}</NameText>
        </Name>
      </ContextMenu>
    </ActionContextProvider>
  );
});
const Name = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
`;
const NameText = styled.span`
  ${ellipsis()}
  min-width: 0;
`;
const Ellipsis = styled.span`
  cursor: default;
`;
const SmallSlash = styled(GoToIcon)`
  width: 12px;
  height: 12px;
  vertical-align: middle;
  flex-shrink: 0;

  fill: ${(props) => props.theme.textTertiary};
  opacity: 0.5;
`;
export default observer(React.forwardRef(NoteBreadcrumb));
