// @flow
import invariant from "invariant";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";
import type { RouterHistory, Match } from "react-router-dom";
import { withRouter } from "react-router-dom";
import DocumentsStore from "stores/DocumentsStore";
import PoliciesStore from "stores/PoliciesStore";
import RevisionsStore from "stores/RevisionsStore";
import SharesStore from "stores/SharesStore";
import UiStore from "stores/UiStore";
import Document from "models/Document";
import Revision from "models/Revision";
import Error404 from "scenes/Error404";
import ErrorOffline from "scenes/ErrorOffline";
import DocumentComponent from "./Document";
import HideSidebar from "./HideSidebar";
import Loading from "./Loading";
import SocketPresence from "./SocketPresence";
import { type LocationWithState } from "types";
import { NotFoundError, OfflineError } from "utils/errors";
import { matchDocumentEdit, updateDocumentUrl } from "utils/routeHelpers";

type Props = {|
  match: Match,
  location: LocationWithState,
  shares: SharesStore,
  documents: DocumentsStore,
  policies: PoliciesStore,
  revisions: RevisionsStore,
  ui: UiStore,
  history: RouterHistory,
|};

@observer
class DataLoader extends React.Component<Props> {
  @observable document: ?Document;
  @observable revision: ?Revision;
  @observable error: ?Error;

  componentDidMount() {
    const { documents, match } = this.props;
    this.document = documents.getByUrl(match.params.documentSlug);
    this.loadDocument();
  }

  componentDidUpdate(prevProps: Props) {
    // If we have the document in the store, but not it's policy then we need to
    // reload from the server otherwise the UI will not know which authorizations
    // the user has
    if (this.document) {
      const document = this.document;

      // we have a special case renderer for deleted documents
      // so no need to do any further data loading
      if (document.isDeleted) {
        return;
      }

      const policy = this.props.policies.get(document.id);

      if (!policy && !this.error) {
        this.loadDocument();
      }
    }

    // Also need to load the revision if it changes
    const { revisionId } = this.props.match.params;
    if (prevProps.match.params.revisionId !== revisionId && revisionId) {
      this.loadRevision();
    }
  }

  get isEditing() {
    return this.props.match.path === matchDocumentEdit;
  }

  onSearchLink = async (term: string) => {
    const results = await this.props.documents.search(term);

    return results
      .filter((result) => result.document.title)
      .map((result) => ({
        title: result.document.title,
        url: result.document.url,
      }));
  };

  onCreateLink = async (title: string) => {
    const document = this.document;
    invariant(document, "document must be loaded to create link");

    const newDocument = await this.props.documents.create({
      collectionId: document.collectionId,
      parentDocumentId: document.parentDocumentId,
      title,
      text: "",
    });

    return newDocument.url;
  };

  loadRevision = async () => {
    const { revisionId } = this.props.match.params;
    this.revision = await this.props.revisions.fetch(revisionId);
  };

  loadDocument = async () => {
    const { shareId, documentSlug, revisionId } = this.props.match.params;

    try {
      this.document = await this.props.documents.fetch(documentSlug, {
        shareId,
      });

      if (revisionId) {
        await this.loadRevision();
      } else {
        this.revision = undefined;
      }
    } catch (err) {
      this.error = err;
      return;
    }

    const document = this.document;

    if (document) {
      const can = this.props.policies.abilities(document.id);

      // sets the document as active in the sidebar, ideally in the future this
      // will be route driven.
      this.props.ui.setActiveDocument(document);

      // If we're attempting to update an archived, deleted, or otherwise
      // uneditable document then forward to the canonical read url.
      if (!can.update && this.isEditing) {
        this.props.history.push(document.url);
        return;
      }

      // Prevents unauthorized request to load share information for the document
      // when viewing a public share link
      if (can.read) {
        this.props.shares.fetch(document.id).catch((err) => {
          if (!(err instanceof NotFoundError)) {
            throw err;
          }
        });
      }

      const isMove = this.props.location.pathname.match(/move$/);
      const canRedirect = !revisionId && !isMove && !shareId;
      if (canRedirect) {
        const canonicalUrl = updateDocumentUrl(
          this.props.match.url,
          document.url
        );
        if (this.props.location.pathname !== canonicalUrl) {
          this.props.history.replace(canonicalUrl);
        }
      }
    }
  };

  render() {
    const { location, policies, ui } = this.props;

    if (this.error) {
      return this.error instanceof OfflineError ? (
        <ErrorOffline />
      ) : (
        <Error404 />
      );
    }

    const document = this.document;
    const revision = this.revision;

    if (!document) {
      return (
        <>
          <Loading location={location} />
          {this.isEditing && <HideSidebar ui={ui} />}
        </>
      );
    }

    const abilities = policies.abilities(document.id);
    const key = this.isEditing ? "editing" : "read-only";

    return (
      <SocketPresence documentId={document.id} isEditing={this.isEditing}>
        {this.isEditing && <HideSidebar ui={ui} />}
        <DocumentComponent
          key={key}
          document={document}
          revision={revision}
          abilities={abilities}
          location={location}
          readOnly={!this.isEditing || !abilities.update || document.isArchived}
          onSearchLink={this.onSearchLink}
          onCreateLink={this.onCreateLink}
        />
      </SocketPresence>
    );
  }
}

export default withRouter(
  inject(
    "ui",
    "auth",
    "documents",
    "revisions",
    "policies",
    "shares"
  )(DataLoader)
);
