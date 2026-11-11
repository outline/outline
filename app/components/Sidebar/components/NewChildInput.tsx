import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  DocumentValidation,
  NavigationLinkValidation,
} from "@shared/validations";
import EditableTitle, { type RefHandle } from "~/components/EditableTitle";
import { toLinkUrl } from "./LinkDialog";
import SidebarLink from "./SidebarLink";

interface Props {
  /** Indentation depth of the row. */
  depth: number;
  /** Creates a document with the entered title. */
  onCreateChild: (title: string) => Promise<void>;
  /** Adds a link for an entered url. When omitted, a url creates a document. */
  onCreateChildLink?: (url: string) => Promise<void>;
  /** Called when the input closes, after saving or canceling. */
  onClose: () => void;
}

const isActive = () => true;

/**
 * A sidebar row with an input that creates a nested document, or adds a link
 * when a url is entered. A pasted url is saved at once.
 */
export function NewChildInput({
  depth,
  onCreateChild,
  onCreateChildLink,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const titleRef = React.useRef<RefHandle>(null);

  const handleSubmit = React.useCallback(
    async (value: string) => {
      // A url becomes a link, any other text the title of a new document.
      const linkUrl = onCreateChildLink ? toLinkUrl(value) : undefined;
      if (!linkUrl && value.length > DocumentValidation.maxTitleLength) {
        throw new Error(
          t("The title must be {{ max }} characters or fewer", {
            max: DocumentValidation.maxTitleLength,
          })
        );
      }

      // Errors are shown by EditableTitle, which keeps the input open.
      titleRef.current?.setIsEditing(false);
      if (linkUrl && onCreateChildLink) {
        await onCreateChildLink(linkUrl);
      } else {
        await onCreateChild(value);
      }
      onClose();
    },
    [t, onCreateChild, onCreateChildLink, onClose]
  );

  const handlePaste = React.useCallback(
    (ev: React.ClipboardEvent<HTMLInputElement>) => {
      if (!onCreateChildLink) {
        return;
      }

      const input = ev.currentTarget;
      const pasted = ev.clipboardData.getData("text/plain");
      const next =
        input.value.slice(0, input.selectionStart ?? 0) +
        pasted +
        input.value.slice(input.selectionEnd ?? input.value.length);
      if (!toLinkUrl(next)) {
        return;
      }

      // Let the paste update the input first, then save it.
      setTimeout(() => input.form?.requestSubmit(), 0);
    },
    [onCreateChildLink]
  );

  return (
    <SidebarLink
      isActive={isActive}
      depth={depth}
      ellipsis={false}
      label={
        <EditableTitle
          title=""
          canUpdate
          isEditing
          placeholder={
            onCreateChildLink ? `${t("New doc or link")}…` : `${t("New doc")}…`
          }
          onCancel={onClose}
          onSubmit={handleSubmit}
          onPaste={handlePaste}
          maxLength={
            onCreateChildLink
              ? NavigationLinkValidation.maxUrlLength
              : DocumentValidation.maxTitleLength
          }
          ref={titleRef}
        />
      }
    />
  );
}
