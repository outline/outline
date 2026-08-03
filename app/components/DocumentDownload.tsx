import { observer } from "mobx-react";
import { ArchiveIcon, CodeIcon, PDFIcon } from "outline-icons";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s, hover } from "@shared/styles";
import { ExportContentType, NotificationEventType } from "@shared/types";
import type Document from "~/models/Document";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
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

  const items = useMemo(() => {
    const radioItems = [
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
      radioItems.push({
        title: "PDF",
        extension: ".pdf",
        value: ExportContentType.Pdf,
        icon: <PDFIcon />,
      });
    }

    return radioItems;
  }, []);

  // The last chosen format may no longer be available, fallback to the first.
  const contentType = items.some((item) => item.value === lastContentType)
    ? lastContentType
    : items[0].value;

  const handleContentTypeChange = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setContentType(ev.target.value as ExportContentType);
    },
    [setContentType]
  );

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
      <Flex gap={8} column>
        {items.map((item) => (
          <Format key={item.value}>
            <HiddenInput
              type="radio"
              name="format"
              value={item.value}
              checked={contentType === item.value}
              onChange={handleContentTypeChange}
            />
            <FormatIcon>{item.icon}</FormatIcon>
            <Flex align="center" gap={6}>
              <Text size="small" weight="xbold">
                {item.title}
              </Text>
              <Text size="small" type="secondary">
                {item.extension}
              </Text>
            </Flex>
          </Format>
        ))}
      </Flex>
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

const HiddenInput = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
`;

const FormatIcon = styled.span`
  display: flex;
  flex-shrink: 0;
  color: ${s("textSecondary")};
  transition: color 100ms ease-in-out;
`;

const Format = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: var(--pointer);
  background: ${s("backgroundSecondary")};
  box-shadow: inset 0 0 0 2px transparent;
  transition: box-shadow 100ms ease-in-out;

  &: ${hover} {
    background: ${s("backgroundTertiary")};
  }

  &:has(input:checked) {
    box-shadow: inset 0 0 0 2px ${s("accent")};

    ${FormatIcon} {
      color: ${s("text")};
    }
  }

  &:has(input:focus-visible) {
    outline: 2px solid ${s("accent")};
    outline-offset: 2px;
  }
`;

const StyledInput = styled.input`
  position: relative;
  top: 1.5px;
`;
