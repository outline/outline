import invariant from "invariant";
import { observer } from "mobx-react";
import { CollectionIcon, DocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import styled from "styled-components";
import { parseOutlineExport } from "shared/utils/zip";
import FileOperation from "models/FileOperation";
import Button from "components/Button";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import Notice from "components/Notice";
import PaginatedList from "components/PaginatedList";
import Scene from "components/Scene";
import Subheading from "components/Subheading";
import FileOperationListItem from "./components/FileOperationListItem";
import useCurrentUser from "hooks/useCurrentUser";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/getDataTransferFiles' or... Remove this comment to see the full error message
import getDataTransferFiles from "utils/getDataTransferFiles";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/uploadFile' or its corre... Remove this comment to see the full error message
import { uploadFile } from "utils/uploadFile";

function ImportExport() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const fileRef = React.useRef();
  const { fileOperations, collections } = useStores();
  const { showToast } = useToasts();
  const [isLoading, setLoading] = React.useState(false);
  const [isImporting, setImporting] = React.useState(false);
  const [isImported, setImported] = React.useState(false);
  const [isExporting, setExporting] = React.useState(false);
  const [file, setFile] = React.useState();
  const [importDetails, setImportDetails] = React.useState();

  const handleImport = React.useCallback(
    async (ev) => {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'undefined' is not assignable to ... Remove this comment to see the full error message
      setImported(undefined);
      setImporting(true);

      try {
        invariant(file, "File must exist to upload");
        const attachment = await uploadFile(file, {
          // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
          name: file.name,
        });
        await collections.import(attachment.id);
        showToast(t("Import started"));
        setImported(true);
      } catch (err) {
        showToast(err.message);
      } finally {
        if (fileRef.current) {
          // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
          fileRef.current.value = "";
        }

        setImporting(false);
        setFile(undefined);
        setImportDetails(undefined);
      }
    },
    [t, file, collections, showToast]
  );

  const handleFilePicked = React.useCallback(async (ev) => {
    ev.preventDefault();
    const files = getDataTransferFiles(ev);
    const file = files[0];
    setFile(file);

    try {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'Item[]' is not assignable to par... Remove this comment to see the full error message
      setImportDetails(await parseOutlineExport(file));
    } catch (err) {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'never[]' is not assignable to pa... Remove this comment to see the full error message
      setImportDetails([]);
    }
  }, []);

  const handlePickFile = React.useCallback(
    (ev) => {
      ev.preventDefault();

      if (fileRef.current) {
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        fileRef.current.click();
      }
    },
    [fileRef]
  );

  const handleExport = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setLoading(true);

      try {
        await collections.export();
        setExporting(true);
        showToast(t("Export in progress…"));
      } finally {
        setLoading(false);
      }
    },
    [t, collections, showToast]
  );

  const handleDelete = React.useCallback(
    async (fileOperation: FileOperation) => {
      try {
        await fileOperations.delete(fileOperation);
        showToast(t("Export deleted"));
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [fileOperations, showToast, t]
  );
  const hasCollections = importDetails
    ? // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
      !!importDetails.filter((detail) => detail.type === "collection").length
    : false;
  const hasDocuments = importDetails
    ? // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
      !!importDetails.filter((detail) => detail.type === "document").length
    : false;
  const isImportable = hasCollections && hasDocuments;

  return (
    <Scene
      title={`${t("Import")} / ${t("Export")}`}
      icon={<DocumentIcon color="currentColor" />}
    >
      <Heading>{t("Import")}</Heading>
      <HelpText>
        <Trans>
          It is possible to import a zip file of folders and Markdown files
          previously exported from an Outline instance. Support will soon be
          added for importing from other services.
        </Trans>
      </HelpText>
      <VisuallyHidden>
        <input
          type="file"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'MutableRefObject<undefined>' is not assignab... Remove this comment to see the full error message
          ref={fileRef}
          onChange={handleFilePicked}
          accept="application/zip"
        />
      </VisuallyHidden>
      {isImported && (
        <Notice>
          <Trans>
            Your file has been uploaded and the import is currently being
            processed, you can safely leave this page while it completes.
          </Trans>
        </Notice>
      )}
      {file && !isImportable && (
        <ImportPreview>
          <Trans
            defaults="Sorry, the file <em>{{ fileName }}</em> is missing valid collections or documents."
            values={{
              // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
              fileName: file.name,
            }}
            components={{
              em: <strong />,
            }}
          />
        </ImportPreview>
      )}
      {file && importDetails && isImportable ? (
        <>
          <ImportPreview as="div">
            <Trans
              defaults="<em>{{ fileName }}</em> looks good, the following collections and their documents will be imported:"
              values={{
                // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
                fileName: file.name,
              }}
              components={{
                em: <strong />,
              }}
            />
            <List>
              {importDetails
                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'detail' implicitly has an 'any' type.
                .filter((detail) => detail.type === "collection")
                // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'detail' implicitly has an 'any' type.
                .map((detail) => (
                  <ImportPreviewItem key={detail.path}>
                    <CollectionIcon />
                    <CollectionName>{detail.name}</CollectionName>
                  </ImportPreviewItem>
                ))}
            </List>
          </ImportPreview>
          <Button
            type="submit"
            onClick={handleImport}
            disabled={isImporting}
            primary
          >
            {isImporting ? `${t("Uploading")}…` : t("Confirm & Import")}
          </Button>
        </>
      ) : (
        <Button type="submit" onClick={handlePickFile} primary>
          {t("Choose File")}…
        </Button>
      )}
      <Heading>{t("Export")}</Heading>
      <HelpText>
        <Trans
          defaults="A full export might take some time, consider exporting a single document or collection. The exported data is a zip of your documents in Markdown format. You may leave this page once the export has started – we will email a link to <em>{{ userEmail }}</em> when it’s complete."
          values={{
            userEmail: user.email,
          }}
          components={{
            em: <strong />,
          }}
        />
      </HelpText>
      <Button
        type="submit"
        onClick={handleExport}
        disabled={isLoading || isExporting}
        primary
      >
        {isExporting
          ? t("Export Requested")
          : isLoading
          ? `${t("Requesting Export")}…`
          : t("Export Data")}
      </Button>
      <br />
      <br />
      <PaginatedList
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ items: any; fetch: any; options: { type: s... Remove this comment to see the full error message
        items={fileOperations.orderedDataExports}
        fetch={fileOperations.fetchPage}
        options={{
          type: "export",
        }}
        heading={
          <Subheading>
            <Trans>Recent exports</Trans>
          </Subheading>
        }
        // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'item' implicitly has an 'any' type.
        renderItem={(item) => (
          <FileOperationListItem
            key={item.id + item.state}
            fileOperation={item}
            handleDelete={handleDelete}
          />
        )}
      />
    </Scene>
  );
}

const List = styled.ul`
  padding: 0;
  margin: 8px 0 0;
`;

const ImportPreview = styled(Notice)`
  margin-bottom: 16px;
`;

const ImportPreviewItem = styled.li`
  display: flex;
  align-items: center;
  list-style: none;
`;

const CollectionName = styled.span`
  font-weight: 500;
  margin-left: 4px;
`;

export default observer(ImportExport);
