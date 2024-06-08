import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { FileOperationFormat, NotificationEventType } from "@shared/types";
import Collection from "~/models/Collection";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import { settingsPath } from "~/utils/routeHelpers";

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
  const user = useCurrentUser();
  const { collections } = useStores();
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

  const handleSubmit = async () => {
    if (collection) {
      await collection.export(format, includeAttachments);
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
    } else {
      await collections.export(format, includeAttachments);
      toast.success(t("Export started"));
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
              <Text size="small">{item.description}</Text>
            </div>
          </Option>
        ))}
      </Flex>
      <hr />
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
          <Text size="small">
            {t("Including uploaded images and files in the exported data")}.
          </Text>{" "}
        </div>
      </Option>
    </ConfirmationDialog>
  );
}

const Option = styled.label`
  display: flex;
  align-items: center;
  gap: 16px;

  p {
    margin: 0;
  }
`;

export default observer(ExportDialog);
