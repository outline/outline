import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { FileOperationFormat, NotificationEventType } from "@shared/types";
import type Collection from "~/models/Collection";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";

type Props = {
  collection?: Collection;
  onSubmit: () => void;
};

function ExportDialog({ collection, onSubmit }: Props) {
  const [format, setFormat] = React.useState<FileOperationFormat>(
    FileOperationFormat.MarkdownZip
  );
  const [includeAttachments, setIncludeAttachments] =
    React.useState<boolean>(true);
  const [includePrivate, setIncludePrivate] = React.useState<boolean>(true);
  const user = useCurrentUser();
  const { collections, ui } = useStores();
  const { t } = useTranslation();
  const appName = env.APP_NAME;

  const handleFormatChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setFormat(ev.target.value as FileOperationFormat);
    },
    []
  );

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
  };

  const items = [
    {
      title: "Markdown",
      description: t(
        "A ZIP file containing the images, and documents in the Markdown format."
      ),
      value: FileOperationFormat.MarkdownZip,
    },
    {
      title: "HTML",
      description: t(
        "A ZIP file containing the images, and documents as HTML files."
      ),
      value: FileOperationFormat.HTMLZip,
    },
    {
      title: "JSON",
      description: t(
        "Structured data that can be used to transfer data to another compatible {{ appName }} instance.",
        {
          appName,
        }
      ),
      value: FileOperationFormat.JSON,
    },
  ];

  return (
    <ConfirmationDialog onSubmit={handleSubmit} submitText={t("Export")}>
      {collection && (
        <Text as="p">
          <Trans
            defaults="Exporting the collection <em>{{collectionName}}</em> may take some time."
            values={{
              collectionName: collection.name,
            }}
            components={{
              em: <strong />,
            }}
          />{" "}
          {user.subscribedToEventType(NotificationEventType.ExportCompleted) &&
            t("You will receive an email when it's complete.")}
        </Text>
      )}
      <Flex gap={12} column>
        {items.map((item) => (
          <Option key={item.value}>
            <input
              type="radio"
              name="format"
              value={item.value}
              checked={format === item.value}
              onChange={handleFormatChange}
            />
            <div>
              <Text as="p" size="small" weight="bold">
                {item.title}
              </Text>
              <Text size="small" type="secondary">
                {item.description}
              </Text>
            </div>
          </Option>
        ))}
      </Flex>
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
            </Text>{" "}
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
            </div>
          </Option>
        )}
      </Flex>
    </ConfirmationDialog>
  );
}

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

export default observer(ExportDialog);
