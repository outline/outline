// @flow
import { observable } from "mobx";
import { observer, inject } from "mobx-react";

import { NewDocumentIcon, PlusIcon, PinIcon } from "outline-icons";
import * as React from "react";
import { withTranslation, Trans, type TFunction } from "react-i18next";
import { Redirect, Link, Switch, Route, type Match } from "react-router-dom";
import styled, { withTheme } from "styled-components";

import CollectionsStore from "stores/CollectionsStore";
import DocumentsStore from "stores/DocumentsStore";
import PoliciesStore from "stores/PoliciesStore";
import UiStore from "stores/UiStore";
import Collection from "models/Collection";

import CollectionEdit from "scenes/CollectionEdit";
import CollectionMembers from "scenes/CollectionMembers";
import Search from "scenes/Search";
import Actions, { Action, Separator } from "components/Actions";
import Button from "components/Button";
import CenteredContent from "components/CenteredContent";
import CollectionIcon from "components/CollectionIcon";
import DocumentList from "components/DocumentList";
import Editor from "components/Editor";
import Flex from "components/Flex";
import Heading from "components/Heading";
import HelpText from "components/HelpText";
import InputSearch from "components/InputSearch";
import { ListPlaceholder } from "components/LoadingPlaceholder";
import Mask from "components/Mask";
import Modal from "components/Modal";
import PageTitle from "components/PageTitle";
import PaginatedDocumentList from "components/PaginatedDocumentList";
import Subheading from "components/Subheading";
import Tab from "components/Tab";
import Tabs from "components/Tabs";
import Tooltip from "components/Tooltip";
import CollectionMenu from "menus/CollectionMenu";
import { type Theme } from "types";
import { AuthorizationError } from "utils/errors";
import { newDocumentUrl, collectionUrl } from "utils/routeHelpers";

type Props = {
  ui: UiStore,
  documents: DocumentsStore,
  collections: CollectionsStore,
  policies: PoliciesStore,
  match: Match,
  theme: Theme,
  t: TFunction,
};

@observer
class CollectionScene extends React.Component<Props> {
  @observable collection: ?Collection;
  @observable isFetching: boolean = true;
  @observable permissionsModalOpen: boolean = false;
  @observable editModalOpen: boolean = false;
  @observable redirectTo: ?string;

  componentDidMount() {
    const { id } = this.props.match.params;
    if (id) {
      this.loadContent(id);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { id } = this.props.match.params;

    if (this.collection) {
      const { collection } = this;
      const policy = this.props.policies.get(collection.id);

      if (!policy) {
        this.loadContent(collection.id);
      }
    }

    if (id && id !== prevProps.match.params.id) {
      this.loadContent(id);
    }
  }

  componentWillUnmount() {
    this.props.ui.clearActiveCollection();
  }

  loadContent = async (id: string) => {
    try {
      const collection = await this.props.collections.fetch(id);

      if (collection) {
        this.props.ui.setActiveCollection(collection);
        this.collection = collection;

        await this.props.documents.fetchPinned({
          collectionId: id,
        });
      }
    } catch (error) {
      if (error instanceof AuthorizationError) {
        this.collection = null;
      }
    } finally {
      this.isFetching = false;
    }
  };

  onNewDocument = (ev: SyntheticEvent<>) => {
    ev.preventDefault();

    if (this.collection) {
      this.redirectTo = newDocumentUrl(this.collection.id);
    }
  };

  onPermissions = (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    this.permissionsModalOpen = true;
  };

  handlePermissionsModalClose = () => {
    this.permissionsModalOpen = false;
  };

  handleEditModalOpen = () => {
    this.editModalOpen = true;
  };

  handleEditModalClose = () => {
    this.editModalOpen = false;
  };

  renderActions() {
    const { match, policies, t } = this.props;
    const can = policies.abilities(match.params.id || "");

    return (
      <Actions align="center" justify="flex-end">
        {can.update && (
          <>
            <Action>
              <InputSearch
                source="collection"
                placeholder={t("Search in collection…")}
                collectionId={match.params.id}
              />
            </Action>
            <Action>
              <Tooltip
                tooltip={t("New document")}
                shortcut="n"
                delay={500}
                placement="bottom"
              >
                <Button onClick={this.onNewDocument} icon={<PlusIcon />}>
                  {t("New doc")}
                </Button>
              </Tooltip>
            </Action>
            <Separator />
          </>
        )}
        <Action>
          <CollectionMenu collection={this.collection} />
        </Action>
      </Actions>
    );
  }

  render() {
    const { documents, theme, t } = this.props;

    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;
    if (!this.isFetching && !this.collection) return <Search notFound />;

    const pinnedDocuments = this.collection
      ? documents.pinnedInCollection(this.collection.id)
      : [];
    const hasPinnedDocuments = !!pinnedDocuments.length;
    const collection = this.collection;
    const collectionName = collection ? collection.name : "";

    return (
      <CenteredContent>
        {collection ? (
          <>
            <PageTitle title={collection.name} />
            {collection.isEmpty ? (
              <Centered column>
                <HelpText>
                  <Trans>
                    <strong>{{ collectionName }}</strong> doesn’t contain any
                    documents yet.
                  </Trans>
                  <br />
                  <Trans>Get started by creating a new one!</Trans>
                </HelpText>
                <Wrapper>
                  <Link to={newDocumentUrl(collection.id)}>
                    <Button icon={<NewDocumentIcon color={theme.buttonText} />}>
                      {t("Create a document")}
                    </Button>
                  </Link>
                  &nbsp;&nbsp;
                  {collection.private && (
                    <Button onClick={this.onPermissions} neutral>
                      {t("Manage members…")}
                    </Button>
                  )}
                </Wrapper>
                <Modal
                  title={t("Collection permissions")}
                  onRequestClose={this.handlePermissionsModalClose}
                  isOpen={this.permissionsModalOpen}
                >
                  <CollectionMembers
                    collection={this.collection}
                    onSubmit={this.handlePermissionsModalClose}
                    onEdit={this.handleEditModalOpen}
                  />
                </Modal>
                <Modal
                  title={t("Edit collection")}
                  onRequestClose={this.handleEditModalClose}
                  isOpen={this.editModalOpen}
                >
                  <CollectionEdit
                    collection={this.collection}
                    onSubmit={this.handleEditModalClose}
                  />
                </Modal>
              </Centered>
            ) : (
              <>
                <Heading>
                  <CollectionIcon collection={collection} size={40} expanded />{" "}
                  {collection.name}
                </Heading>

                {collection.description && (
                  <React.Suspense fallback={<p>Loading…</p>}>
                    <Editor
                      id={collection.id}
                      key={collection.description}
                      defaultValue={collection.description}
                      readOnly
                    />
                  </React.Suspense>
                )}

                {hasPinnedDocuments && (
                  <>
                    <Subheading>
                      <TinyPinIcon size={18} /> {t("Pinned")}
                    </Subheading>
                    <DocumentList documents={pinnedDocuments} showPin />
                  </>
                )}

                <Tabs>
                  <Tab to={collectionUrl(collection.id)} exact>
                    {t("Recently updated")}
                  </Tab>
                  <Tab to={collectionUrl(collection.id, "recent")} exact>
                    {t("Recently published")}
                  </Tab>
                  <Tab to={collectionUrl(collection.id, "old")} exact>
                    {t("Least recently updated")}
                  </Tab>
                  <Tab to={collectionUrl(collection.id, "alphabetical")} exact>
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
                    <PaginatedDocumentList
                      key="recent"
                      documents={documents.recentlyPublishedInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchRecentlyPublished}
                      options={{ collectionId: collection.id }}
                      showPublished
                      showPin
                    />
                  </Route>
                  <Route path={collectionUrl(collection.id)}>
                    <PaginatedDocumentList
                      documents={documents.recentlyUpdatedInCollection(
                        collection.id
                      )}
                      fetch={documents.fetchRecentlyUpdated}
                      options={{ collectionId: collection.id }}
                      showPin
                    />
                  </Route>
                </Switch>
              </>
            )}

            {this.renderActions()}
          </>
        ) : (
          <>
            <Heading>
              <Mask height={35} />
            </Heading>
            <ListPlaceholder count={5} />
          </>
        )}
      </CenteredContent>
    );
  }
}

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

const Wrapper = styled(Flex)`
  justify-content: center;
  margin: 10px 0;
`;

export default withTranslation()<CollectionScene>(
  inject(
    "collections",
    "policies",
    "documents",
    "ui"
  )(withTheme(CollectionScene))
);
