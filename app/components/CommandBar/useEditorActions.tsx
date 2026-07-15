import { CollapseIcon } from "outline-icons";
import { useMemo } from "react";
import { toast } from "sonner";
import { findConvertibleHeading } from "@shared/editor/queries/toggleBlock";
import { createAction } from "~/actions";
import { ActiveDocumentSection } from "~/actions/sections";
import { useDocumentContext } from "~/components/DocumentContext";
import useCommandBarActions from "~/hooks/useCommandBarActions";

/**
 * Registers command bar actions that operate on the active document's editor
 * instance, such as converting all headings to toggle headings.
 */
export default function useEditorActions() {
  const documentContext = useDocumentContext();

  // Observable reads that trigger re-registration when the editor mounts or
  // the document's headings change, so action visibility stays up-to-date.
  const { isEditorInitialized } = documentContext;
  const headingCount = documentContext.headings.length;

  const actions = useMemo(
    () => [
      createAction({
        name: ({ t }) => t("Convert headings to toggle headings"),
        analyticsName: "Convert headings to toggle headings",
        section: ActiveDocumentSection,
        icon: <CollapseIcon />,
        keywords: "toggle collapsible collapse fold headings convert",
        visible: ({ activeDocumentId, stores }) => {
          const { document, editor } = documentContext;
          if (
            !activeDocumentId ||
            !editor ||
            editor.props.readOnly ||
            document?.id !== activeDocumentId
          ) {
            return false;
          }
          return (
            stores.policies.abilities(activeDocumentId).update &&
            !!findConvertibleHeading(editor.view.state.doc)
          );
        },
        perform: ({ t }) => {
          documentContext.editor?.commands.convertHeadingsToToggleBlocks();
          toast.success(t("Headings converted to toggle headings"));
        },
      }),
    ],
    [documentContext]
  );

  useCommandBarActions(actions, [isEditorInitialized, headingCount]);
}
