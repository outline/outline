import { observer } from "mobx-react";
import { useCallback, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { ExportContentType, NotificationEventType } from "@shared/types";
import Document from "~/models/Document";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import history from "~/utils/history";
import { settingsPath } from "~/utils/routeHelpers";

type Props = {
  document: Document;
  onSubmit: () => void;
};

export const DocumentDownload = observer(({ document, onSubmit }: Props) => {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const hasChildDocuments = !!document.childDocuments.length;

  const [contentType, setContentType] = useState<ExportContentType>(
    ExportContentType.Markdown
  );
  const [includeChildDocuments, setIncludeChildDocuments] =
    useState<boolean>(hasChildDocuments);

  const handleContentTypeChange = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setContentType(ev.target.value as ExportContentType);
    },
    []
  );

  const handleIncludeChildDocumentsChange = useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setIncludeChildDocuments(ev.target.checked);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    await document.download({
      contentType,
      includeChildDocuments,
    });

    if (includeChildDocuments) {
      toast.success(t("Export started"), {
        description: t(`Your file will be available in {{ location }} soon`, {
          location: `"${t("Settings")} > ${t("Export")}"`,
        }),
        action: {
          label: t("View"),
          onClick: () => {
            history.push(settingsPath("export"));
          },
        },
      });
    }

    onSubmit();
  }, [t, document, contentType, includeChildDocuments, onSubmit]);

  const items = useMemo(() => {
    const radioItems = [
      {
        title: "Markdown",
        description: includeChildDocuments
          ? t(
              "A ZIP file containing the images, and documents in the Markdown format."
            )
          : t(
              "Document, along with the images, will be downloaded in the Markdown format."
            ),
        value: ExportContentType.Markdown,
      },
      {
        title: "HTML",
        description: includeChildDocuments
          ? t("A ZIP file containing the images, and documents as HTML files.")
          : t(
              "Document, along with the images, will be downloaded as a HTML file."
            ),
        value: ExportContentType.Html,
      },
    ];

    if (env.PDF_EXPORT_ENABLED) {
      radioItems.push({
        title: "PDF",
        description: includeChildDocuments
          ? t("A ZIP file containing the images, and documents as PDF files.")
          : t(
              "Document, along with the images, will be downloaded as a PDF file."
            ),
        value: ExportContentType.Pdf,
      });
    }

    return radioItems;
  }, [t, includeChildDocuments]);

  return (
    <ConfirmationDialog onSubmit={handleSubmit} submitText={t("Export")}>
      <Flex gap={12} column>
        {items.map((item) => (
          <Option key={item.value}>
            <StyledInput
              type="radio"
              name="format"
              value={item.value}
              checked={contentType === item.value}
              onChange={handleContentTypeChange}
            />
            <div>
              <Text as="p" size="small" weight="bold">
                {item.title}
              </Text>
              {item.description ? (
                <Text size="small" type="secondary">
                  {item.description}
                </Text>
              ) : null}
            </div>
          </Option>
        ))}
      </Flex>
      {hasChildDocuments && (
        <>
          <hr />
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
                <Trans
                  defaults="When selected, exporting the document <em>{{documentName}}</em> may take some time."
                  values={{
                    documentName: document.titleWithDefault,
                  }}
                  components={{
                    em: <strong />,
                  }}
                />{" "}
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
