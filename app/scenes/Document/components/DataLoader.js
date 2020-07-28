// @flow
import * as React from "react";
import invariant from "invariant";
import { withRouter } from "react-router-dom";
import type { Location, RouterHistory } from "react-router-dom";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { matchDocumentEdit, updateDocumentUrl } from "utils/routeHelpers";
import DocumentComponent from "./Document";
import Revision from "models/Revision";
import Document from "models/Document";
import SocketPresence from "./SocketPresence";
import Loading from "./Loading";
import HideSidebar from "./HideSidebar";
import Error404 from "scenes/Error404";
import ErrorOffline from "scenes/ErrorOffline";
import DocumentsStore from "stores/DocumentsStore";
import PoliciesStore from "stores/PoliciesStore";
import RevisionsStore from "stores/RevisionsStore";
import UiStore from "stores/UiStore";
import { OfflineError } from "utils/errors";

type Props = {|
  match: Object,
  location: Location,
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
      const policy = this.props.policies.get(this.document.id);

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

  goToDocumentCanonical = () => {
    if (this.document) {
      this.props.history.push(this.document.url);
    }
  };

  get isEditing() {
    return this.props.match.path === matchDocumentEdit;
  }

  onSearchLink = async (term: string) => {
    const results = await this.props.documents.search(term);

    return results
      .filter(result => result.document.title)
      .map((result, index) => ({
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
      this.props.ui.setActiveDocument(document);

      if (document.isArchived && this.isEditing) {
        return this.goToDocumentCanonical();
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
        <React.Fragment>
          <Loading location={location} />
          {this.isEditing && <HideSidebar ui={ui} />}
        </React.Fragment>
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
          readOnly={!this.isEditing}
          onSearchLink={this.onSearchLink}
          onCreateLink={this.onCreateLink}
        />
      </SocketPresence>
    );
  }
}

export default withRouter(
  inject("ui", "auth", "documents", "revisions", "policies")(DataLoader)
);
