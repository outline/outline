/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '..';
import { View, Star } from '../models';
import { flushdb, seed } from '../test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

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

  it('should allow changing sort direction', async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/documents.list', {
      body: { token: user.getJwtToken(), direction: 'ASC' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data[1].id).toEqual(document.id);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/documents.list');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
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
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.title).toBe('Updated title');
    expect(body.data.text).toBe('Updated text');
    expect(body.data.collection.documents[1].title).toBe('Updated title');
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
});
