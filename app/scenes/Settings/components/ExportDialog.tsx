import { observer } from "mobx-react";
import { CodeIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import styled from "styled-components";
import { FileOperationFormat } from "@shared/types";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Flex from "~/components/Flex";
import MarkdownIcon from "~/components/Icons/Markdown";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type Props = {
  onSubmit: () => void;
};

function ExportDialog({ onSubmit }: Props) {
  const [format, setFormat] = React.useState<FileOperationFormat>(
    FileOperationFormat.MarkdownZip
  );
  const { collections } = useStores();
  const { t } = useTranslation();

  const handleFormatChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setFormat(ev.target.value as FileOperationFormat);
    },
    []
  );

  const handleSubmit = React.useCallback(async () => {
    await collections.export(format);
    onSubmit();
  }, [collections, format, onSubmit]);

  return (
    <ConfirmationDialog onSubmit={handleSubmit} submitText={t("Export")}>
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
