// @flow
import { observer } from "mobx-react";
import { NewDocumentIcon, PlusIcon, PinIcon, MoreIcon } from "outline-icons";
import * as React from "react";
import Dropzone from "react-dropzone";
import { useTranslation, Trans } from "react-i18next";
import { useParams, Redirect, Link, Switch, Route } from "react-router-dom";
import styled, { css } from "styled-components";
import CollectionPermissions from "scenes/CollectionPermissions";
import Search from "scenes/Search";
import { Action, Separator } from "components/Actions";
import Badge from "components/Badge";
import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import CollectionDescription from "components/CollectionDescription";
import CollectionIcon from "components/CollectionIcon";
import DocumentList from "components/DocumentList";
import Flex from "components/Flex";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import InputSearchPage from "components/InputSearchPage";
import LoadingIndicator from "components/LoadingIndicator";
import { ListPlaceholder } from "components/LoadingPlaceholder";
import Mask from "components/Mask";
import Modal from "components/Modal";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Scene from "components/Scene";
import Subheading from "components/Subheading";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import Tooltip from "components/Tooltip";
import useCurrentTeam from "hooks/useCurrentTeam";
import useImportDocument from "hooks/useImportDocument";
import useStores from "hooks/useStores";
import useUnmount from "hooks/useUnmount";
import CollectionMenu from "menus/CollectionMenu";
import { newDocumentUrl, collectionUrl } from "utils/routeHelpers";

function CollectionScene() {
  const params = useParams();
  const { t } = useTranslation();
  const { documents, policies, collections, ui } = useStores();
  const team = useCurrentTeam();
  const [isFetching, setFetching] = React.useState();
  const [error, setError] = React.useState();
  const [permissionsModalOpen, setPermissionsModalOpen] = React.useState(false);

  const collectionId = params.id || "";
  const collection = collections.get(collectionId);
  const can = policies.abilities(collectionId || "");
  const canUser = policies.abilities(team.id);
  const { handleFiles, isImporting } = useImportDocument(collectionId);

  React.useEffect(() => {
    if (collection) {
      ui.setActiveCollection(collection);
    }
  }, [ui, collection]);

  React.useEffect(() => {
    setError(null);
    documents.fetchPinned({ collectionId });
  }, [documents, collectionId]);

  React.useEffect(() => {
    async function load() {
      if ((!can || !collection) && !error && !isFetching) {
        try {
          setError(null);
          setFetching(true);
          await collections.fetch(collectionId);
        } catch (err) {
          setError(err);
        } finally {
          setFetching(false);
        }
      }
    }
    load();
  }, [collections, isFetching, collection, error, collectionId, can]);

  useUnmount(ui.clearActiveCollection);

  const handlePermissionsModalOpen = React.useCallback(() => {
    setPermissionsModalOpen(true);
  }, []);

  const handlePermissionsModalClose = React.useCallback(() => {
    setPermissionsModalOpen(false);
  }, []);

  const handleRejection = React.useCallback(() => {
    ui.showToast(
      t("Document not supported – try Markdown, Plain text, HTML, or Word"),
      { type: "error" }
    );
  }, [t, ui]);

  if (!collection && error) {
    return <Search notFound />;
  }

  const pinnedDocuments = collection
    ? documents.pinnedInCollection(collection.id)
    : [];
  const collectionName = collection ? collection.name : "";
  const hasPinnedDocuments = !!pinnedDocuments.length;

  return collection ? (
    <Scene
      centered={false}
      textTitle={collection.name}
      title={
        <>
          <CollectionIcon collection={collection} expanded />
          &nbsp;
          {collection.name}
        </>
      }
      actions={
        <>
          <Action>
            <InputSearchPage
              source="collection"
              placeholder={`${t("Search in collection")}…`}
              label={`${t("Search in collection")}…`}
              collectionId={collectionId}
            />
          </Action>
          {can.update && (
            <Action>
              <Tooltip
                tooltip={t("New document")}
                shortcut="n"
                delay={500}
                placement="bottom"
              >
                <Button
                  as={Link}
                  to={collection ? newDocumentUrl(collection.id) : ""}
                  disabled={!collection}
                  icon={<PlusIcon />}
                >
                  {t("New doc")}
                </Button>
              </Tooltip>
            </Action>
          )}
          <Separator />
          <Action>
            <CollectionMenu
              collection={collection}
              placement="bottom-end"
              label={(props) => (
                <Button
                  icon={<MoreIcon />}
                  {...props}
                  borderOnHover
                  neutral
                  small
                />
              )}
            />
          </Action>
        </>
      }
    >
      <Dropzone
        accept={documents.importFileTypes.join(", ")}
        onDropAccepted={handleFiles}
        onDropRejected={handleRejection}
        disabled={!can.update}
        noClick
        multiple
      >
        {({
          getRootProps,
          getInputProps,
          isDragActive,
          isDragAccept,
          isDragReject,
        }) => (
          <DropzoneContainer
            {...getRootProps()}
            isDragActive={isDragActive}
            tabIndex="-1"
          >
            <input {...getInputProps()} />
            {isImporting && <LoadingIndicator />}

            <CenteredContent withStickyHeader>
              {collection.isEmpty ? (
                <Centered column>
                  <HelpText>
                    <Trans
                      defaults="<em>{{ collectionName }}</em> doesn’t contain any
                    documents yet."
                      values={{ collectionName }}
                      components={{ em: <strong /> }}
                    />
                    <br />
                    {canUser.createDocument && (
                      <Trans>Get started by creating a new one!</Trans>
                    )}
                  </HelpText>
                  <Empty>
                    {canUser.createDocument && (
                      <Link to={newDocumentUrl(collection.id)}>
                        <Button icon={<NewDocumentIcon color="currentColor" />}>
                          {t("Create a document")}
                        </Button>
                      </Link>
                    )}
                    &nbsp;&nbsp;
                    <Button onClick={handlePermissionsModalOpen} neutral>
                      {t("Manage permissions")}…
                    </Button>
                  </Empty>
                  <Modal
                    title={t("Collection permissions")}
                    onRequestClose={handlePermissionsModalClose}
                    isOpen={permissionsModalOpen}
                  >
                    <CollectionPermissions collection={collection} />
                  </Modal>
                </Centered>
              ) : (
                <>
                  <Heading>
                    <CollectionIcon
                      collection={collection}
                      size={40}
                      expanded
                    />{" "}
                    {collection.name}{" "}
                    {!collection.permission && (
                      <Tooltip
                        tooltip={t(
                          "This collection is only visible to those given access"
                        )}
                        placement="bottom"
                      >
                        <Badge>{t("Private")}</Badge>
                      </Tooltip>
                    )}
                  </Heading>
                  <CollectionDescription collection={collection} />

                  {hasPinnedDocuments && (
                    <>
                      <Subheading sticky>
                        <TinyPinIcon size={18} color="currentColor" />{" "}
                        {t("Pinned")}
                      </Subheading>
                      <DocumentList documents={pinnedDocuments} showPin />
                    </>
                  )}

                  <Tabs>
                    <Tab to={collectionUrl(collection.id)} exact>
                      {t("Documents")}
                    </Tab>
                    <Tab to={collectionUrl(collection.id, "updated")} exact>
                      {t("Recently updated")}
                    </Tab>
                    <Tab to={collectionUrl(collection.id, "published")} exact>
                      {t("Recently published")}
                    </Tab>
                    <Tab to={collectionUrl(collection.id, "old")} exact>
                      {t("Least recently updated")}
                    </Tab>
                    <Tab
                      to={collectionUrl(collection.id, "alphabetical")}
                      exact
                    >
                      {t("A–Z")}
                    </Tab>
                  </Tabs>
                  <Switch>
                    <Route path={collectionUrl(collection.id, "alphabetical")}>
                      <PaginatedDocumentList
                        key="alphabetical"
                        documents={documents.alphabeticalInCollection(
                          collection.id
                        )}
                        fetch={documents.fetchAlphabetical}
                        options={{ collectionId: collection.id }}
                        showPin
                      />
                    </Route>
                    <Route path={collectionUrl(collection.id, "old")}>
                      <PaginatedDocumentList
                        key="old"
                        documents={documents.leastRecentlyUpdatedInCollection(
                          collection.id
                        )}
                        fetch={documents.fetchLeastRecentlyUpdated}
                        options={{ collectionId: collection.id }}
                        showPin
                      />
                    </Route>
                    <Route path={collectionUrl(collection.id, "recent")}>
                      <Redirect
                        to={collectionUrl(collection.id, "published")}
                      />
                    </Route>
                    <Route path={collectionUrl(collection.id, "published")}>
                      <PaginatedDocumentList
                        key="published"
                        documents={documents.recentlyPublishedInCollection(
                          collection.id
                        )}
                        fetch={documents.fetchRecentlyPublished}
                        options={{ collectionId: collection.id }}
                        showPublished
                        showPin
                      />
                    </Route>
                    <Route path={collectionUrl(collection.id, "updated")}>
                      <PaginatedDocumentList
                        key="updated"
                        documents={documents.recentlyUpdatedInCollection(
                          collection.id
                        )}
                        fetch={documents.fetchRecentlyUpdated}
                        options={{ collectionId: collection.id }}
                        showPin
                      />
                    </Route>
                    <Route path={collectionUrl(collection.id)} exact>
                      <PaginatedDocumentList
                        documents={documents.rootInCollection(collection.id)}
                        fetch={documents.fetchPage}
                        options={{
                          collectionId: collection.id,
                          parentDocumentId: null,
                          sort: collection.sort.field,
                          direction: "ASC",
                        }}
                        showNestedDocuments
                        showPin
                      />
                    </Route>
                  </Switch>
                </>
              )}
              <DropMessage>{t("Drop documents to import")}</DropMessage>
            </CenteredContent>
          </DropzoneContainer>
        )}
      </Dropzone>
    </Scene>
  ) : (
    <CenteredContent>
      <Heading>
        <Mask height={35} />
      </Heading>
      <ListPlaceholder count={5} />
    </CenteredContent>
  );
}

const DropMessage = styled(HelpText)`
  opacity: 0;
  pointer-events: none;
`;

const DropzoneContainer = styled.div`
  min-height: calc(100% - 56px);
  position: relative;

  ${({ isDragActive, theme }) =>
    isDragActive &&
    css`
      &:after {
        display: block;
        content: "";
        position: absolute;
        top: 24px;
        right: 24px;
        bottom: 24px;
        left: 24px;
        background: ${theme.background};
        border-radius: 8px;
        border: 1px dashed ${theme.divider};
        z-index: 1;
      }

      ${DropMessage} {
        opacity: 1;
        z-index: 2;
        position: absolute;
        text-align: center;
        top: 50%;
        left: 50%;
        transform: translateX(-50%);
      }
    `}
`;

const Centered = styled(Flex)`
  text-align: center;
  margin: 40vh auto 0;
  max-width: 380px;
  transform: translateY(-50%);
`;

const TinyPinIcon = styled(PinIcon)`
  position: relative;
  top: 4px;
  opacity: 0.8;
`;

const Empty = styled(Flex)`
  justify-content: center;
  margin: 10px 0;
`;

export default observer(CollectionScene);
