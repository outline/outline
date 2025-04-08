import { FileIcon } from "outline-icons";
import * as React from "react";
import { Action, ActionContext } from "~/types";
import { isMac } from "~/utils/browser";

const pdfActions = (ctx: ActionContext): Action[] => {
  const { t, isEditor, activeEditor } = ctx;

  if (!isEditor || !activeEditor) {
    return [];
  }

  // Check if the Pdf node type exists in the current editor schema
  const pdfNodeType = activeEditor.schema.nodes.pdf_document;
  if (!pdfNodeType) {
    console.warn("Pdf node type not found in editor schema");
    return [];
  }

  // Check if the command exists on the node type
  const uploadCommand = activeEditor.commands.uploadPdfPlaceholder?.();
  if (!uploadCommand) {
    console.warn("uploadPdfPlaceholder command not found for Pdf node");
    return [];
  }

  return [
    {
      id: "pdf-upload",
      name: t("Upload PDF"),
      shortName: "PDF",
      keywords: "pdf document upload file embed",
      section: t("Integrations"),
      icon: React.createElement(FileIcon),
      perform: () => {
        // Execute the command defined in Pdf.tsx
        uploadCommand(activeEditor.state, activeEditor.dispatch);
      },
      // Optional: Add shortcut if desired
      // shortcut: ["Mod", "Shift", "p"], // Example: Cmd+Shift+P or Ctrl+Shift+P
    },
  ];
};

export default pdfActions;
