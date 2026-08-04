import { observer } from "mobx-react";
import { ArchiveIcon, CodeIcon, PDFIcon } from "outline-icons";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { ExportContentType, NotificationEventType } from "@shared/types";
import type Document from "~/models/Document";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import { FileFormatSelector } from "~/components/Export/FileFormatSelector";
import type { FileFormat } from "~/components/Export/FileFormatSelector";
import MarkdownIcon from "~/components/Icons/MarkdownIcon";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePersistedState from "~/hooks/usePersistedState";
import useStores from "~/hooks/useStores";

type Props = {
  document: Document;
  onSubmit: () => void;
};

export const DocumentDownload = observer(({ document, onSubmit }: Props) => {
  const { t } = useTranslation();
  const { ui } = useStores();
  const user = useCurrentUser();
  const hasChildDocuments = !!document.childDocuments.length;

  const [lastContentType, setContentType] =
    usePersistedState<ExportContentType>(
      "document-download-format",
      ExportContentType.Markdown
    );
  const [includeChildDocuments, setIncludeChildDocuments] =
    useState<boolean>(hasChildDocuments);

  const formats = useMemo(() => {
    const items: FileFormat<ExportContentType>[] = [
      {
        title: "Markdown",
        extension: ".md",
        value: ExportContentType.Markdown,
        icon: <MarkdownIcon />,
      },
      {
        title: "HTML",
        extension: ".html",
        value: ExportContentType.Html,
        icon: <CodeIcon />,
      },
      {
        title: "TextBundle",
        extension: ".textpack",
        value: ExportContentType.TextBundle,
        icon: <ArchiveIcon />,
      },
    ];

    if (env.PDF_EXPORT_ENABLED) {
      items.push({
        title: "PDF",
        extension: ".pdf",
        value: ExportContentType.Pdf,
        icon: <PDFIcon />,
      });
    }

    return items;
  }, []);

  // The last chosen format may no longer be available, fallback to the first.
  const contentType = formats.some((format) => format.value === lastContentType)
    ? lastContentType
    : formats[0].value;

  const handleIncludeChildDocumentsChange = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setIncludeChildDocuments(ev.target.checked);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    const response = await document.download({
      contentType,
      includeChildDocuments,
    });

    if (includeChildDocuments && response?.data?.fileOperation) {
      const fileOperationId = response.data.fileOperation.id;
      const toastId = `export-${fileOperationId}`;

      const timeoutId = setTimeout(() => {
        toast.success(t("Export started"), {
          id: toastId,
          description: t("A link to your file will be sent through email soon"),
          duration: 3000,
        });
        ui.exportToasts.delete(fileOperationId);
      }, 6000);

      ui.registerExportToast(fileOperationId, toastId, timeoutId);

      toast.loading(t("Export started"), {
        id: toastId,
        description: `${t("Preparing your download")}…`,
        duration: Infinity,
      });
    }

    onSubmit();
  }, [t, ui, document, contentType, includeChildDocuments, onSubmit]);

  return (
    <ConfirmationDialog onSubmit={handleSubmit} submitText={t("Download")}>
      <FileFormatSelector
        formats={formats}
        value={contentType}
        onChange={setContentType}
      />
      {hasChildDocuments && (
        <>
          <hr style={{ margin: "16px 0 " }} />
          <Option>
            <StyledInput
              type="checkbox"
              name="includeChildDocuments"
              checked={includeChildDocuments}
              onChange={handleIncludeChildDocumentsChange}
            />
            <Flex column gap={4}>
              <Text as="p" size="small" weight="bold">
                {t("Include child documents")}
              </Text>
              <Text as="p" size="small" type="secondary">
                {t(
                  "When selected, exporting the document will take extra time."
                )}{" "}
                {user.subscribedToEventType(
                  NotificationEventType.ExportCompleted
                ) && t("You will receive an email when it's complete.")}
              </Text>
            </Flex>
          </Option>
        </>
      )}
    </ConfirmationDialog>
  );
});

const Option = styled.label`
  display: flex;
  align-items: baseline;
  gap: 16px;

  p {
    margin: 0;
  }
`;

const StyledInput = styled.input`
  position: relative;
  top: 1.5px;
`;
