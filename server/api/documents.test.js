/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '..';
import { Document, View, Star, Revision } from '../models';
import { flushdb, seed } from '../test/support';
import { buildShare, buildUser } from '../test/factories';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#documents.info', async () => {
  it('should return published document', async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.info', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
  });

  it('should return drafts', async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();

    const res = await server.post('/api/documents.info', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
  });

  it('should return redacted documents from shareId without token', async () => {
    const { document } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });

    const res = await server.post('/api/documents.info', {
      body: { shareId: share.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
    expect(body.data.collection).toEqual(undefined);
    expect(body.data.createdBy).toEqual(undefined);
    expect(body.data.updatedBy).toEqual(undefined);
  });

  it('should return documents from shareId with token', async () => {
    const { user, document, collection } = await seed();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });

    const res = await server.post('/api/documents.info', {
      body: { token: user.getJwtToken(), shareId: share.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(document.id);
    expect(body.data.collection.id).toEqual(collection.id);
    expect(body.data.createdBy.id).toEqual(user.id);
    expect(body.data.updatedBy.id).toEqual(user.id);
  });

  it('should require authorization without token', async () => {
    const { document } = await seed();
    const res = await server.post('/api/documents.info', {
      body: { id: document.id },
    });
    expect(res.status).toEqual(403);
  });

  it('should require authorization with incorrect token', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.info', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    expect(res.status).toEqual(403);
  });

  it('should require a valid shareId', async () => {
    const res = await server.post('/api/documents.info', {
      body: { shareId: 123 },
    });
    expect(res.status).toEqual(400);
  });
});

describe('#documents.list', async () => {
  it('should return documents', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[0].id).toEqual(document.id);
  });

  it('should not return unpublished documents', async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();

    const res = await server.post('/api/documents.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it('should allow changing sort direction', async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.list', {
      body: { token: user.getJwtToken(), direction: 'ASC' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data[1].id).toEqual(document.id);
  });

  it('should allow filtering by collection', async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.list', {
      body: { token: user.getJwtToken(), collection: document.atlasId },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.list');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#documents.drafts', async () => {
  it('should return unpublished documents', async () => {
    const { user, document } = await seed();
    document.publishedAt = null;
    await document.save();

    const res = await server.post('/api/documents.drafts', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });
});

describe('#documents.revision', async () => {
  it("should return a document's revisions", async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.revisions', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).not.toEqual(document.id);
    expect(body.data[0].title).toEqual(document.title);
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.revisions', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.search', async () => {
  it('should return results', async () => {
    const { user } = await seed();
    const res = await server.post('/api/documents.search', {
      body: { token: user.getJwtToken(), query: 'much' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].text).toEqual('# Much guidance');
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.search');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#documents.viewed', async () => {
  it('should return empty result if no views', async () => {
    const { user } = await seed();
    const res = await server.post('/api/documents.viewed', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should return recently viewed documents', async () => {
    const { user, document } = await seed();
    await View.increment({ documentId: document.id, userId: user.id });

    const res = await server.post('/api/documents.viewed', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(document.id);
  });

  it('should not return recently viewed but deleted documents', async () => {
    const { user, document } = await seed();
    await View.increment({ documentId: document.id, userId: user.id });
    await document.destroy();

    const res = await server.post('/api/documents.viewed', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.viewed');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#documents.starred', async () => {
  it('should return empty result if no stars', async () => {
    const { user } = await seed();
    const res = await server.post('/api/documents.starred', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });

  it('should return starred documents', async () => {
    const { user, document } = await seed();
    await Star.create({ documentId: document.id, userId: user.id });

    const res = await server.post('/api/documents.starred', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(document.id);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.starred');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#documents.pin', async () => {
  it('should pin the document', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.pin', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();
    expect(body.data.pinned).toEqual(true);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.pin');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.pin', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.unpin', async () => {
  it('should unpin the document', async () => {
    const { user, document } = await seed();
    document.pinnedBy = user;
    await document.save();

    const res = await server.post('/api/documents.unpin', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();
    expect(body.data.pinned).toEqual(false);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.unpin');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.unpin', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.star', async () => {
  it('should star the document', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.star', {
      body: { token: user.getJwtToken(), id: document.id },
    });

    const stars = await Star.findAll();
    expect(res.status).toEqual(200);
    expect(stars.length).toEqual(1);
    expect(stars[0].documentId).toEqual(document.id);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.star');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.star', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.unstar', async () => {
  it('should unstar the document', async () => {
    const { user, document } = await seed();
    await Star.create({ documentId: document.id, userId: user.id });

    const res = await server.post('/api/documents.unstar', {
      body: { token: user.getJwtToken(), id: document.id },
    });

    const stars = await Star.findAll();
    expect(res.status).toEqual(200);
    expect(stars.length).toEqual(0);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.star');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.unstar', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.create', async () => {
  it('should create as a new document', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/documents.create', {
      body: {
        token: user.getJwtToken(),
        collection: collection.id,
        title: 'new document',
        text: 'hello',
        publish: true,
      },
    });
    const body = await res.json();
    const newDocument = await Document.findById(body.data.id);
    expect(res.status).toEqual(200);
    expect(newDocument.parentDocumentId).toBe(null);
    expect(newDocument.collection.id).toBe(collection.id);
  });

  it('should fallback to a default title', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/documents.create', {
      body: {
        token: user.getJwtToken(),
        collection: collection.id,
        title: ' ',
        text: ' ',
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('Untitled document');
    expect(body.data.text).toBe('# Untitled document');
  });

  it('should create as a child and add to collection if published', async () => {
    const { user, document, collection } = await seed();
    const res = await server.post('/api/documents.create', {
      body: {
        token: user.getJwtToken(),
        collection: collection.id,
        title: 'new document',
        text: 'hello',
        parentDocument: document.id,
        publish: true,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('new document');
    expect(body.data.collection.documents.length).toBe(2);
    expect(body.data.collection.documents[0].children[0].id).toBe(body.data.id);
  });

  it('should error with invalid parentDocument', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/documents.create', {
      body: {
        token: user.getJwtToken(),
        collection: collection.id,
        title: 'new document',
        text: 'hello',
        parentDocument: 'd7a4eb73-fac1-4028-af45-d7e34d54db8e',
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body).toMatchSnapshot();
  });

  it('should create as a child and not add to collection', async () => {
    const { user, document, collection } = await seed();
    const res = await server.post('/api/documents.create', {
      body: {
        token: user.getJwtToken(),
        collection: collection.id,
        title: 'new document',
        text: 'hello',
        parentDocument: document.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('new document');
    expect(body.data.collection.documents.length).toBe(2);
  });
});

describe('#documents.update', async () => {
  it('should update document details in the root', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.update', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: 'Updated title',
        text: 'Updated text',
        lastRevision: document.revision,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('Updated title');
    expect(body.data.text).toBe('Updated text');
    expect(body.data.collection.documents[0].title).toBe('Updated title');
  });

  it('should not create new version when autosave=true', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.update', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: 'Updated title',
        text: 'Updated text',
        lastRevision: document.revision,
        autosave: true,
      },
    });

    const prevRevisionRecords = await Revision.count();
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('Updated title');
    expect(body.data.text).toBe('Updated text');

    const revisionRecords = await Revision.count();
    expect(revisionRecords).toBe(prevRevisionRecords);
  });

  it('should fallback to a default title', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.update', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: ' ',
        text: ' ',
        lastRevision: document.revision,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('Untitled document');
    expect(body.data.text).toBe('# Untitled document');
    expect(body.data.collection.documents[0].title).toBe('Untitled document');
  });

  it('should fail if document lastRevision does not match', async () => {
    const { user, document } = await seed();

    const res = await server.post('/api/documents.update', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        text: 'Updated text',
        lastRevision: 123,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(400);
    expect(body).toMatchSnapshot();
  });

  it('should update document details for children', async () => {
    const { user, document, collection } = await seed();
    collection.documentStructure = [
      {
        id: 'af1da94b-9591-4bab-897c-11774b804b77',
        url: '/d/some-beef-RSZwQDsfpc',
        title: 'some beef',
        children: [
          {
            id: 'ab1da94b-9591-4bab-897c-11774b804b66',
            url: '/d/another-doc-RSZwQDsfpc',
            title: 'Another doc',
            children: [],
          },
          { ...document.toJSON(), children: [] },
        ],
      },
    ];
    await collection.save();

    const res = await server.post('/api/documents.update', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
        title: 'Updated title',
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('Updated title');
    expect(body.data.collection.documents[0].children[1].title).toBe(
      'Updated title'
    );
  });

  it('should require authentication', async () => {
    const { document } = await seed();
    const res = await server.post('/api/documents.update', {
      body: { id: document.id, text: 'Updated' },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/documents.update', {
      body: { token: user.getJwtToken(), id: document.id, text: 'Updated' },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#documents.delete', async () => {
  it('should allow deleting document', async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.delete', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });

  it('should allow deleting document without collection', async () => {
    const { user, document, collection } = await seed();

    // delete collection without hooks to trigger document deletion
    await collection.destroy({ hooks: false });
    const res = await server.post('/api/documents.delete', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });

  it('should require authentication', async () => {
    const { document } = await seed();
    const res = await server.post('/api/documents.delete', {
      body: { id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});
