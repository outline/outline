// @flow
import { Search } from "js-search";
import { last } from "lodash";
import { observer } from "mobx-react";
import {
  TableOfContentsIcon,
  EditIcon,
  PlusIcon,
  MoreIcon,
  SearchIcon,
} from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";
import { Dialog, DialogBackdrop, useDialogState } from "reakit";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { type DocumentPath } from "stores/CollectionsStore";
import Document from "models/Document";
import { Action, Separator } from "components/Actions";
import Badge from "components/Badge";
import Button from "components/Button";
import Collaborators from "components/Collaborators";
import Divider from "components/Divider";
import DocumentBreadcrumb from "components/DocumentBreadcrumb";
import Flex from "components/Flex";
import Header from "components/Header";
import PathToDocument from "components/PathToDocument";
import Tooltip from "components/Tooltip";
import PublicBreadcrumb from "./PublicBreadcrumb";
import ShareButton from "./ShareButton";
import useMobile from "hooks/useMobile";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";
import DocumentMenu from "menus/DocumentMenu";
import NewChildDocumentMenu from "menus/NewChildDocumentMenu";
import TableOfContentsMenu from "menus/TableOfContentsMenu";
import TemplatesMenu from "menus/TemplatesMenu";
import { type NavigationNode } from "types";
import { metaDisplay } from "utils/keyboard";
import { newDocumentUrl, editDocumentUrl } from "utils/routeHelpers";

type Props = {|
  document: Document,
  sharedTree: ?NavigationNode,
  shareId: ?string,
  isDraft: boolean,
  isEditing: boolean,
  isRevision: boolean,
  isSaving: boolean,
  isPublishing: boolean,
  publishingIsDisabled: boolean,
  savingIsDisabled: boolean,
  onDiscard: () => void,
  onSave: ({
    done?: boolean,
    publish?: boolean,
    autosave?: boolean,
  }) => void,
  headings: { title: string, level: number, id: string }[],
|};

function DocumentHeader({
  document,
  shareId,
  isEditing,
  isDraft,
  isPublishing,
  isRevision,
  isSaving,
  savingIsDisabled,
  publishingIsDisabled,
  sharedTree,
  onSave,
  headings,
}: Props) {
  const { t } = useTranslation();
  const { auth, ui, policies, collections, documents } = useStores();
  const isMobile = useMobile();
  const { showToast } = useToasts();
  const dialog = useDialogState({ modal: true });
  const theme = useTheme();
  const isNew = document.isNewDocument;
  const isTemplate = document.isTemplate;
  const can = policies.abilities(document.id);
  const canShareDocument = auth.team && auth.team.sharing && can.share;
  const canToggleEmbeds = auth.team && auth.team.documentEmbeds;
  const canEdit = can.update && !isEditing;
  const hasCollection = collections.get(document.computedCollectionId);
  const [searchTerm, setSearchTerm] = React.useState();
  const [selectedPath, setSelectedPath] = React.useState<?DocumentPath>();

  const checked = React.useCallback(
    (result) => {
      if (!selectedPath) return;

      if (selectedPath.type === "collection" && selectedPath.id === result.id) {
        return true;
      }
      if (
        selectedPath.type === "document" &&
        selectedPath.id === result.id &&
        selectedPath.collectionId === result.collectionId
      ) {
        return true;
      }
      return false;
    },
    [selectedPath]
  );

  const handleSave = React.useCallback(() => {
    onSave({ done: true });
  }, [onSave]);

  const handlePublish = React.useCallback(() => {
    if (!hasCollection) {
      dialog.setVisible(true);
      return;
    }
    onSave({ done: true, publish: true });
  }, [dialog, hasCollection, onSave]);

  const handleFilter = (ev) => {
    setSearchTerm(ev.target.value);
  };

  const searchIndex = React.useMemo(() => {
    const paths = collections.pathsToDocuments;
    const index = new Search("id");
    index.addIndex("title");

    // Build index
    const indexeableDocuments = [];
    paths.forEach((path) => {
      const doc = documents.get(path.id);
      if (!doc || !doc.isTemplate) {
        indexeableDocuments.push(path);
      }
    });
    index.addDocuments(indexeableDocuments);

    return index;
  }, [documents, collections.pathsToDocuments]);

  const results: DocumentPath[] = React.useMemo(() => {
    const onlyShowCollections = document.isTemplate;
    let results = [];
    if (collections.isLoaded) {
      if (searchTerm) {
        results = searchIndex.search(searchTerm);
      } else {
        results = searchIndex._documents;
      }
    }

    if (onlyShowCollections) {
      results = results.filter((result) => result.type === "collection");
    } else {
      // Exclude root from search results if document is already at the root
      if (!document.parentDocumentId) {
        results = results.filter(
          (result) => result.id !== document.collectionId
        );
      }

      // Exclude document if on the path to result, or the same result
      results = results.filter(
        (result) =>
          !result.path.map((doc) => doc.id).includes(document.id) &&
          last(result.path.map((doc) => doc.id)) !== document.parentDocumentId
      );
    }

    return results;
  }, [document, collections, searchTerm, searchIndex]);

  const handlePublishFromModal = async () => {
    if (!document) return;
    if (!selectedPath) {
      showToast(t("Please select a path"));
      return;
    }
    dialog.setVisible(false);

    if (selectedPath.type === "collection") {
      onSave({
        done: true,
        publish: true,
        collectionId: selectedPath.collectionId,
      });
    } else {
      onSave({
        done: true,
        publish: true,
        collectionId: selectedPath.collectionId,
        parentDocumentId: selectedPath.id,
      });
    }
  };

  const row = ({ index, data, style }) => {
    const result = data[index];
    return (
      <PathToDocument
        result={result}
        document={document}
        collection={collections.get(result.collectionId)}
        onSelect={(result) => setSelectedPath(result)}
        style={style}
        checked={checked(result)}
      />
    );
  };

  const data = results;

  const toc = (
    <Tooltip
      tooltip={ui.tocVisible ? t("Hide contents") : t("Show contents")}
      shortcut="ctrl+alt+h"
      delay={250}
      placement="bottom"
    >
      <Button
        onClick={
          ui.tocVisible ? ui.hideTableOfContents : ui.showTableOfContents
        }
        icon={<TableOfContentsIcon />}
        iconColor="currentColor"
        borderOnHover
        neutral
      />
    </Tooltip>
  );

  const editAction = (
    <Action>
      <Tooltip
        tooltip={t("Edit {{noun}}", { noun: document.noun })}
        shortcut="e"
        delay={500}
        placement="bottom"
      >
        <Button
          as={Link}
          icon={<EditIcon />}
          to={editDocumentUrl(document)}
          neutral
        >
          {t("Edit")}
        </Button>
      </Tooltip>
    </Action>
  );

  if (shareId) {
    return (
      <Header
        title={document.title}
        breadcrumb={
          <PublicBreadcrumb
            documentId={document.id}
            shareId={shareId}
            sharedTree={sharedTree}
          >
            {toc}
          </PublicBreadcrumb>
        }
        actions={canEdit ? editAction : <div />}
      />
    );
  }

  return (
    <>
      <Header
        breadcrumb={
          <DocumentBreadcrumb document={document}>
            {!isEditing && toc}
          </DocumentBreadcrumb>
        }
        title={
          <>
            {document.title}{" "}
            {document.isArchived && <Badge>{t("Archived")}</Badge>}
          </>
        }
        actions={
          <>
            {isMobile && (
              <TocWrapper>
                <TableOfContentsMenu headings={headings} />
              </TocWrapper>
            )}
            {!isPublishing && isSaving && <Status>{t("Saving")}…</Status>}
            <Collaborators
              document={document}
              currentUserId={auth.user ? auth.user.id : undefined}
            />
            {isEditing && !isTemplate && isNew && (
              <Action>
                <TemplatesMenu document={document} />
              </Action>
            )}
            {!isEditing && canShareDocument && (!isMobile || !isTemplate) && (
              <Action>
                <ShareButton document={document} />
              </Action>
            )}
            {isEditing && (
              <>
                <Action>
                  <Tooltip
                    tooltip={t("Save")}
                    shortcut={`${metaDisplay}+enter`}
                    delay={500}
                    placement="bottom"
                  >
                    <Button
                      onClick={handleSave}
                      disabled={savingIsDisabled}
                      neutral={isDraft}
                    >
                      {isDraft ? t("Save Draft") : t("Done Editing")}
                    </Button>
                  </Tooltip>
                </Action>
              </>
            )}
            {canEdit && editAction}
            {canEdit && can.createChildDocument && !isMobile && (
              <Action>
                <NewChildDocumentMenu
                  document={document}
                  label={(props) => (
                    <Tooltip
                      tooltip={t("New document")}
                      shortcut="n"
                      delay={500}
                      placement="bottom"
                    >
                      <Button icon={<PlusIcon />} {...props} neutral>
                        {t("New doc")}
                      </Button>
                    </Tooltip>
                  )}
                />
              </Action>
            )}
            {canEdit && isTemplate && !isDraft && !isRevision && (
              <Action>
                <Button
                  icon={<PlusIcon />}
                  as={Link}
                  to={newDocumentUrl(document.computedCollectionId, {
                    templateId: document.id,
                  })}
                  primary
                >
                  {t("New from template")}
                </Button>
              </Action>
            )}
            {can.update && isDraft && !isRevision && !hasCollection && (
              <Wrapper>
                <DialogBackdrop {...dialog}>
                  <Dialog
                    {...dialog}
                    aria-label="Choose a collection"
                    preventBodyScroll
                    hideOnEsc
                  >
                    <Position>
                      <Content>
                        <Flex align="center">
                          <StyledIcon
                            type="Search"
                            size={26}
                            color={theme.textTertiary}
                          />
                          <Input
                            type="search"
                            placeholder={`${t(
                              "Search collections & documents"
                            )}…`}
                            onChange={handleFilter}
                            autoFocus
                          />
                        </Flex>
                        <Results>
                          <AutoSizer>
                            {({ width, height }) => {
                              return (
                                <Flex role="listbox" column>
                                  <List
                                    key={data.length}
                                    width={width}
                                    height={height}
                                    itemData={data}
                                    itemCount={data.length}
                                    itemSize={40}
                                    itemKey={(index, data) => data[index].id}
                                  >
                                    {row}
                                  </List>
                                </Flex>
                              );
                            }}
                          </AutoSizer>
                        </Results>
                        <Divider />
                        <ButtonWrapper justify="flex-end">
                          <Button
                            disabled={!selectedPath}
                            onClick={handlePublishFromModal}
                          >
                            Publish
                          </Button>
                        </ButtonWrapper>
                      </Content>
                    </Position>
                  </Dialog>
                </DialogBackdrop>
              </Wrapper>
            )}
            {can.update && isDraft && !isRevision && (
              <Action>
                <Tooltip
                  tooltip={t("Publish")}
                  shortcut={`${metaDisplay}+shift+p`}
                  delay={500}
                  placement="bottom"
                >
                  <Button
                    onClick={handlePublish}
                    disabled={publishingIsDisabled}
                  >
                    {isPublishing ? `${t("Publishing")}…` : t("Publish")}
                  </Button>
                </Tooltip>
              </Action>
            )}
            {!isEditing && (
              <>
                <Separator />
                <Action>
                  <DocumentMenu
                    document={document}
                    isRevision={isRevision}
                    label={(props) => (
                      <Button
                        icon={<MoreIcon />}
                        iconColor="currentColor"
                        {...props}
                        borderOnHover
                        neutral
                      />
                    )}
                    showToggleEmbeds={canToggleEmbeds}
                    showPrint
                  />
                </Action>
              </>
            )}
          </>
        }
      />
    </>
  );
}

const Status = styled(Action)`
  padding-left: 0;
  padding-right: 4px;
  color: ${(props) => props.theme.slate};
`;

const TocWrapper = styled(Action)`
  position: absolute;
  left: 42px;
`;

const ButtonWrapper = styled(Flex)`
  margin: 10px 0;
`;

const Content = styled.div`
  background: ${(props) => props.theme.background};
  width: 70vw;
  max-width: 600px;
  height: 40vh;
  max-height: 500px;
  border-radius: 8px;
  padding: 10px;
  box-shadow: ${(props) => props.theme.menuShadow};

  ${breakpoint("mobile", "tablet")`
    right: -2vh;
    width: 90vw;
`};
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 10px 10px 40px;
  font-size: 16px;
  font-weight: 400;
  outline: none;
  border: 0;
  background: ${(props) => props.theme.sidebarBackground};
  transition: ${(props) => props.theme.backgroundTransition};
  border-radius: 4px;

  color: ${(props) => props.theme.text};

  ::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }
  ::-webkit-input-placeholder {
    color: ${(props) => props.theme.placeholder};
  }
  :-moz-placeholder {
    color: ${(props) => props.theme.placeholder};
  }
  ::-moz-placeholder {
    color: ${(props) => props.theme.placeholder};
  }
  :-ms-input-placeholder {
    color: ${(props) => props.theme.placeholder};
  }
`;

const StyledIcon = styled(SearchIcon)`
  position: absolute;
  left: 12px;
`;

const Wrapper = styled.div`
  position: relative;
`;

const Position = styled.div`
  position: absolute;
  z-index: ${(props) => props.theme.depths.menu};
  right: 8vh;
  top: 4vh;

  ${breakpoint("mobile", "tablet")`
    position: fixed !important;
    transform: none !important;
    top: auto !important;
    right: 8px !important;
    bottom: 16px !important;
    left: 8px !important;
  `};
`;

const Results = styled.div`
  padding: 8px 0;
  height: calc(93% - 52px);
`;

export default observer(DocumentHeader);
