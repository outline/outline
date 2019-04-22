// @flow
import { takeRight } from 'lodash';
import { User, Document } from '../models';
import presentUser from './user';

type Options = {
  isPublic?: boolean,
};

export default async function present(document: Document, options: ?Options) {
  options = {
    isPublic: false,
    ...options,
  };

  // For empty document content, return the title
  if (!document.text.trim()) {
    document.text = `# ${document.title}`;
  }

  const data = {
    id: document.id,
    url: document.url,
    urlId: document.urlId,
    title: document.title,
    text: document.text,
    emoji: document.emoji,
    createdAt: document.createdAt,
    createdBy: undefined,
    updatedAt: document.updatedAt,
    updatedBy: undefined,
    publishedAt: document.publishedAt,
    archivedAt: document.archivedAt,
    deletedAt: document.deletedAt,
    teamId: document.teamId,
    collaborators: [],
    starred: document.starred ? !!document.starred.length : undefined,
    revision: document.revisionCount,
    pinned: undefined,
    collectionId: undefined,
    parentDocumentId: undefined,
  };

  if (!options.isPublic) {
    data.pinned = !!document.pinnedById;
    data.collectionId = document.collectionId;
    data.parentDocumentId = document.parentDocumentId;
    data.createdBy = presentUser(document.createdBy);
    data.updatedBy = presentUser(document.updatedBy);

    // TODO: This could be further optimized
    data.collaborators = await User.findAll({
      where: {
        id: takeRight(document.collaboratorIds, 10) || [],
      },
    }).map(presentUser);
  }

  return data;
}
