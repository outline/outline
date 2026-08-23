import { observer } from "mobx-react";
import { ArchiveIcon, CodeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { FileOperationFormat, NotificationEventType } from "@shared/types";
import type Collection from "~/models/Collection";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import { FileFormatSelector } from "~/components/Export/FileFormatSelector";
import type { FileFormat } from "~/components/Export/FileFormatSelector";
import MarkdownIcon from "~/components/Icons/MarkdownIcon";
import OutlineIcon from "~/components/Icons/OutlineIcon";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

type Props = {
  collection?: Collection;
  onSubmit: () => void;
};

export const ExportDialog = observer(({ collection, onSubmit }: Props) => {
  const [format, setFormat] = React.useState<FileOperationFormat>(
    FileOperationFormat.MarkdownZip
  );
  const [includeAttachments, setIncludeAttachments] =
    React.useState<boolean>(true);
  const [includePrivate, setIncludePrivate] = React.useState<boolean>(true);
  const user = useCurrentUser();
  const { collections, ui } = useStores();
  const { t } = useTranslation();

  const handleIncludeAttachmentsChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setIncludeAttachments(ev.target.checked);
    },
    []
  );

  const handleIncludePrivateChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setIncludePrivate(ev.target.checked);
    },
    []
  );

  const handleSubmit = async () => {
    let response;

    if (collection) {
      response = await collection.export(format, includeAttachments);
    } else {
      response = await collections.export({
        format,
        includeAttachments,
        includePrivate,
      });
    }

    if (response?.data?.fileOperation) {
      ui.showExportToast(response.data.fileOperation.id);
    }

    onSubmit();
  };

  const formats: FileFormat<FileOperationFormat>[] = [
    {
      title: "Markdown",
      extension: ".markdown.zip",
      value: FileOperationFormat.MarkdownZip,
      icon: <MarkdownIcon />,
    },
    {
      title: "HTML",
      extension: ".html.zip",
      value: FileOperationFormat.HTMLZip,
      icon: <CodeIcon />,
    },
    {
      title: "TextBundle",
      extension: ".textbundle.zip",
      value: FileOperationFormat.TextBundleZip,
      icon: <ArchiveIcon />,
    },
    {
      title: "JSON",
      extension: ".json.zip",
      value: FileOperationFormat.JSON,
      icon: <OutlineIcon />,
    },
  ];

  return (
    <ConfirmationDialog onSubmit={handleSubmit} submitText={t("Export")}>
      {collection && (
        <Text as="p">
          {t("Exporting the collection may take some time.")}{" "}
          {user.subscribedToEventType(NotificationEventType.ExportCompleted) &&
            t("You will receive an email when it's complete.")}
        </Text>
      )}
      <FileFormatSelector
        formats={formats}
        value={format}
        onChange={setFormat}
      />
      <HR />
      <Flex gap={12} column>
        <Option>
          <input
            type="checkbox"
            name="includeAttachments"
            checked={includeAttachments}
            onChange={handleIncludeAttachmentsChange}
          />
          <div>
            <Text as="p" size="small" weight="bold">
              {t("Include attachments")}
            </Text>
            <Text size="small" type="secondary">
              {t("Including uploaded images and files in the exported data")}.
            </Text>
          </div>
        </Option>
        {!collection && (
          <Option>
            <input
              type="checkbox"
              name="includePrivate"
              checked={includePrivate}
              onChange={handleIncludePrivateChange}
            />
            <div>
              <Text as="p" size="small" weight="bold">
                {t("Include private collections")}
              </Text>
              <Text size="small" type="secondary">
                {t(
                  "As an admin you can export collections you are not currently a member of"
                )}
                .
              </Text>
            </div>
          </Option>
        )}
      </Flex>
    </ConfirmationDialog>
  );
});

const HR = styled.hr`
  margin: 16px 0;
`;

const Option = styled.label`
  display: flex;
  align-items: start;
  gap: 16px;

  input {
    margin-top: 4px;
  }

  p {
    margin: 0;
  }
`;
