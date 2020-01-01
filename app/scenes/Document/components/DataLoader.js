// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import type { Location, RouterHistory } from 'react-router-dom';
import { observable } from 'mobx';
import { observer, inject } from 'mobx-react';
import { matchDocumentEdit, updateDocumentUrl } from 'utils/routeHelpers';
import DocumentComponent from './Document';
import Revision from 'models/Revision';
import Document from 'models/Document';
import Socket from './Socket';
import Loading from './Loading';
import Error404 from 'scenes/Error404';
import ErrorOffline from 'scenes/ErrorOffline';
import DocumentsStore from 'stores/DocumentsStore';
import PoliciesStore from 'stores/PoliciesStore';
import RevisionsStore from 'stores/RevisionsStore';
import UiStore from 'stores/UiStore';

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

  constructor(props) {
    super();
    this.document = props.documents.getByUrl(props.match.params.documentSlug);
    this.loadDocument(props);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.document) {
      const policy = this.props.policies.get(this.document.id);

      if (!policy) {
        this.loadDocument(this.props);
      }
    }

    if (
      prevProps.match.params.revisionId !== this.props.match.params.revisionId
    ) {
      this.loadDocument(this.props);
    }
  }

  goToDocumentCanonical = () => {
    if (this.document) this.props.history.push(this.document.url);
  };

  get isEditing() {
    const document = this.document;

    return !!(
      this.props.match.path === matchDocumentEdit ||
      (document && !document.id)
    );
  }

  onSearchLink = async (term: string) => {
    const results = await this.props.documents.search(term);
    return results.map((result, index) => ({
      title: result.document.title,
      url: result.document.url,
    }));
  };

  loadDocument = async props => {
    const { shareId, revisionId } = props.match.params;

    try {
      this.document = await props.documents.fetch(
        props.match.params.documentSlug,
        { shareId }
      );

      if (revisionId) {
        this.revision = await props.revisions.fetch(
          props.match.params.documentSlug,
          { revisionId }
        );
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

      const isMove = props.location.pathname.match(/move$/);
      const canRedirect = !this.revision && !isMove && !shareId;
      if (canRedirect) {
        const canonicalUrl = updateDocumentUrl(props.match.url, document.url);
        if (props.location.pathname !== canonicalUrl) {
          props.history.replace(canonicalUrl);
        }
      }
    }
  };

  render() {
    const { location, policies } = this.props;

    if (this.error) {
      return navigator.onLine ? <Error404 /> : <ErrorOffline />;
    }

    const document = this.document;
    const revision = this.revision;

    if (!document) return <Loading location={location} />;

    const abilities = policies.abilities(document.id);
    const key = this.isEditing ? 'editing' : 'read-only';

    return (
      <Socket documentId={document.id} isEditing={this.isEditing}>
        <DocumentComponent
          key={key}
          document={document}
          revision={revision}
          abilities={abilities}
          location={location}
          readOnly={!this.isEditing}
          onSearchLink={this.onSearchLink}
        />
      </Socket>
    );
  }
}

export default withRouter(
  inject('ui', 'auth', 'documents', 'revisions', 'policies')(DataLoader)
);
