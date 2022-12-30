import { observer } from "mobx-react";
import { CodeIcon, DocumentIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { FileOperationFormat } from "@shared/types";
import Collection from "~/models/Collection";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import MarkdownIcon from "~/components/Icons/MarkdownIcon";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";

type Props = {
  collection?: Collection;
  onSubmit: () => void;
};

function ExportDialog({ collection, onSubmit }: Props) {
  const [format, setFormat] = React.useState<FileOperationFormat>(
    FileOperationFormat.MarkdownZip
  );
  const { showToast } = useToasts();
  const { collections, notificationSettings } = useStores();
  const { t } = useTranslation();

  React.useEffect(() => {
    notificationSettings.fetchPage({});
  }, [notificationSettings]);

  const handleFormatChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setFormat(ev.target.value as FileOperationFormat);
    },
    []
  );

  const handleSubmit = async () => {
    if (collection) {
      await collection.export(format);
    } else {
      await collections.export(format);
    }
    onSubmit();
    showToast(t("Export started"), { type: "success" });
  };

  return (
    <ConfirmationDialog onSubmit={handleSubmit} submitText={t("Export")}>
      {collection && (
        <Text>
          <Trans
            defaults="Exporting the collection <em>{{collectionName}}</em> may take some time."
            values={{
              collectionName: collection.name,
            }}
            components={{
              em: <strong />,
            }}
          />{" "}
          {notificationSettings.getByEvent("emails.export_completed") &&
            t("You will receive an email when it's complete.")}
        </Text>
      )}
      <Flex gap={12} column>
        <Option>
          <Input
            type="radio"
            name="format"
            value={FileOperationFormat.MarkdownZip}
            checked={format === FileOperationFormat.MarkdownZip}
            onChange={handleFormatChange}
          />
          <Format>
            <MarkdownIcon size={32} color="currentColor" />
            Markdown
          </Format>
          <Text size="small">
            <Trans>
              A ZIP file containing the images, and documents in the Markdown
              format.
            </Trans>
          </Text>
        </Option>
        <Option>
          <Input
            type="radio"
            name="format"
            value={FileOperationFormat.HTMLZip}
            checked={format === FileOperationFormat.HTMLZip}
            onChange={handleFormatChange}
          />
          <Format>
            <CodeIcon size={32} color="currentColor" />
            HTML
          </Format>
          <Text size="small">
            <Trans>
              A ZIP file containing the images, and documents as HTML files.
            </Trans>
          </Text>
        </Option>
        <Option>
          <Input
            type="radio"
            name="format"
            value={FileOperationFormat.Outline}
            checked={format === FileOperationFormat.Outline}
            onChange={handleFormatChange}
          />
          <Format>
            <DocumentIcon size={32} />
            <Trans>Backup</Trans>
          </Format>
          <Text size="small">
            <Trans>
              A file that can be used to transfer data to another compatible
              Outline instance.
            </Trans>
          </Text>
        </Option>
      </Flex>
    </ConfirmationDialog>
  );
}

const Format = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  background: ${(props) => props.theme.secondaryBackground};
  border-radius: 6px;
  width: 25%;
  font-weight: 500;
  font-size: 14px;
  text-align: center;
  padding: 10px 8px;
  cursor: var(--pointer);
`;

const Option = styled.label`
  display: flex;
  align-items: center;
  gap: 16px;

  p {
    margin: 0;
  }
`;

const Input = styled.input`
  display: none;

  &:checked + ${Format} {
    box-shadow: inset 0 0 0 2px ${(props) => props.theme.inputBorderFocused};
  }
`;

export default observer(ExportDialog);
