import * as React from "react";
import { useTranslation } from "react-i18next";

/**
 * Hook that provides a dictionary of translated UI strings.
 *
 * @returns An object containing all translated UI strings used throughout the application
 */
export default function useDictionary() {
  const { t } = useTranslation();

  return React.useMemo(
    () => ({
      addColumnAfter: t("Add column after"),
      addColumnBefore: t("Add column before"),
      addRowAfter: t("Add row after"),
      addRowBefore: t("Add row before"),
      alignCenter: t("Align center"),
      alignLeft: t("Align left"),
      alignRight: t("Align right"),
      alignDefaultWidth: t("Default width"),
      alignFullWidth: t("Full width"),
      bulletList: t("Bulleted list"),
      checkboxList: t("Todo list"),
      codeBlock: t("Code block"),
      codeCopied: t("Copied to clipboard"),
      codeInline: t("Code"),
      comment: t("Comment"),
      copy: t("Copy"),
      createIssue: t("Create issue from selection"),
      createLink: t("Create link"),
      createLinkError: t("Sorry, an error occurred creating the link"),
      createNewDoc: t("Create a new doc"),
      createNewChildDoc: t("Create a new child doc"),
      deleteColumn: t("Delete"),
      deleteRow: t("Delete"),
      deleteTable: t("Delete table"),
      deleteAttachment: t("Delete file"),
      download: t("Download"),
      downloadAttachment: t("Download file"),
      replaceAttachment: t("Replace file"),
      deleteImage: t("Delete image"),
      downloadImage: t("Download image"),
      replaceImage: t("Replace image"),
      em: t("Italic"),
      embedInvalidLink: t("Sorry, that link won’t work for this embed type"),
      file: t("File attachment"),
      enterLink: `${t("Enter a link")}…`,
      h1: t("Big heading"),
      h2: t("Medium heading"),
      h3: t("Small heading"),
      h4: t("Extra small heading"),
      heading: t("Heading"),
      hr: t("Divider"),
      image: t("Image"),
      fileUploadError: t("Sorry, an error occurred uploading the file"),
      imageCaptionPlaceholder: t("Write a caption"),
      info: t("Info"),
      infoNotice: t("Info notice"),
      link: t("Link"),
      linkCopied: t("Link copied to clipboard"),
      mark: t("Highlight"),
      newLineEmpty: `${t("Type '/' to insert")}…`,
      newLineWithSlash: `${t("Keep typing to filter")}…`,
      noResults: t("No results"),
      openLink: t("Open link"),
      goToLink: t("Go to link"),
      openLinkError: t("Sorry, that type of link is not supported"),
      orderedList: t("Ordered list"),
      pageBreak: t("Page break"),
      pasteLink: `${t("Paste a link")}…`,
      pasteLinkWithTitle: (service: string) =>
        t("Paste a {{service}} link…", {
          service,
        }),
      placeholder: t("Placeholder"),
      quote: t("Quote"),
      removeLink: t("Remove link"),
      searchOrPasteLink: `${t("Search or paste a link")}…`,
      strikethrough: t("Strikethrough"),
      strong: t("Bold"),
      subheading: t("Subheading"),
      sortAsc: t("Sort ascending"),
      sortDesc: t("Sort descending"),
      table: t("Table"),
      exportAsCSV: t("Export as CSV"),
      toggleHeader: t("Toggle header"),
      mathInline: t("Math inline (LaTeX)"),
      mathBlock: t("Math block (LaTeX)"),
      tip: t("Tip"),
      tipNotice: t("Tip notice"),
      warning: t("Warning"),
      warningNotice: t("Warning notice"),
      success: t("Success"),
      successNotice: t("Success notice"),
      insertDate: t("Current date"),
      insertTime: t("Current time"),
      insertDateTime: t("Current date and time"),
      indent: t("Indent"),
      outdent: t("Outdent"),
      video: t("Video"),
      untitled: t("Untitled"),
      none: t("None"),
    }),
    [t]
  );
}

export type Dictionary = ReturnType<typeof useDictionary>;
