import invariant from "invariant";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { RouteComponentProps, StaticContext } from "react-router";
import RootStore from "~/stores/RootStore";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import Error404 from "~/scenes/Error404";
import ErrorOffline from "~/scenes/ErrorOffline";
import withStores from "~/components/withStores";
import { NavigationNode } from "~/types";
import { NotFoundError, OfflineError } from "~/utils/errors";
import history from "~/utils/history";
import { matchDocumentEdit } from "~/utils/routeHelpers";
import HideSidebar from "./HideSidebar";
import Loading from "./Loading";

type Props = RootStore &
  RouteComponentProps<
    {
      documentSlug: string;
      revisionId?: string;
      shareId?: string;
      title?: string;
    },
    StaticContext,
    {
      title?: string;
    }
  > & {
    children: (arg0: any) => React.ReactNode;
  };

@observer
class DataLoader extends React.Component<Props> {
  sharedTree: NavigationNode | null | undefined;

  @observable
  document: Document | null | undefined;

  @observable
  revision: Revision | null | undefined;

  @observable
  shapshot: Blob | null | undefined;

  @observable
  error: Error | null | undefined;

  componentDidMount() {
    const { documents, match } = this.props;
    this.document = documents.getByUrl(match.params.documentSlug);
    this.sharedTree = this.document
      ? documents.getSharedTree(this.document.id)
      : undefined;
    this.loadDocument();
  }

  componentDidUpdate(prevProps: Props) {
    // If we have the document in the store, but not it's policy then we need to
    // reload from the server otherwise the UI will not know which authorizations
    // the user has
    if (this.document) {
      const document = this.document;
      const policy = this.props.policies.get(document.id);

      if (
        !policy &&
        !this.error &&
        this.props.auth.user &&
        this.props.auth.user.id
      ) {
        this.loadDocument();
      }
    }

    // Also need to load the revision if it changes
    const { revisionId } = this.props.match.params;

    if (
      prevProps.match.params.revisionId !== revisionId &&
      revisionId &&
      revisionId !== "latest"
    ) {
      this.loadRevision();
    }
  }

  get isEditRoute() {
    return this.props.match.path === matchDocumentEdit;
  }

  get isEditing() {
    return this.isEditRoute || this.props.auth?.team?.collaborativeEditing;
  }

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

    if (revisionId) {
      this.revision = await this.props.revisions.fetch(revisionId);
    }
  };

  loadDocument = async () => {
    const { shareId, documentSlug, revisionId } = this.props.match.params;

    // sets the document as active in the sidebar if we already have it loaded
    if (this.document) {
      this.props.ui.setActiveDocument(this.document);
    }

    try {
      const response = await this.props.documents.fetchWithSharedTree(
        documentSlug,
        {
          shareId,
        }
      );
      this.sharedTree = response.sharedTree;
      this.document = response.document;

      if (revisionId && revisionId !== "latest") {
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
      if (!can.update && this.isEditRoute) {
        history.push(document.url);
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
    }
  };

  render() {
    const { location, policies, auth, match, ui } = this.props;
    const { revisionId } = match.params;

    if (this.error) {
      return this.error instanceof OfflineError ? (
        <ErrorOffline />
      ) : (
        <Error404 />
      );
    }

    const team = auth.team;
    const document = this.document;
    const revision = this.revision;

    if (!document || !team || (revisionId && !revision)) {
      return (
        <>
          <Loading location={location} />
          {this.isEditing && !team?.collaborativeEditing && (
            <HideSidebar ui={ui} />
          )}
        </>
      );
    }

    const abilities = policies.abilities(document.id);
    // We do not want to remount the document when changing from view->edit
    // on the multiplayer flag as the doc is guaranteed to be upto date.
    const key = team.collaborativeEditing
      ? ""
      : this.isEditing
      ? "editing"
      : "read-only";

    return (
      <React.Fragment key={key}>
        {this.isEditing && !team.collaborativeEditing && (
          <HideSidebar ui={ui} />
        )}
        {this.props.children({
          document,
          revision,
          abilities,
          isEditing: this.isEditing,
          readOnly:
            !this.isEditing ||
            !abilities.update ||
            document.isArchived ||
            !!revisionId,
          onCreateLink: this.onCreateLink,
          sharedTree: this.sharedTree,
        })}
      </React.Fragment>
    );
  }
}

export default withStores(DataLoader);
