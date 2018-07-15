/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '..';
import { flushdb, seed } from '../test/support';
import { buildUser } from '../test/factories';
import { Collection } from '../models';
const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#collections.list', async () => {
  it('should require authentication', async () => {
    const res = await server.post('/api/collections.list');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should return collections', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/collections.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(collection.id);
  });
});

describe('#collections.export', async () => {
  it('should require authentication', async () => {
    const res = await server.post('/api/collections.export');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should return success', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/collections.export', {
      body: { token: user.getJwtToken(), id: collection.id },
    });

    expect(res.status).toEqual(200);
  });
});

describe('#collections.exportAll', async () => {
  it('should require authentication', async () => {
    const res = await server.post('/api/collections.exportAll');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const user = await buildUser();
    const res = await server.post('/api/collections.exportAll', {
      body: { token: user.getJwtToken() },
    });
    expect(res.status).toEqual(403);
  });

  it('should return success', async () => {
    const { admin } = await seed();
    const res = await server.post('/api/collections.exportAll', {
      body: { token: admin.getJwtToken() },
    });

    expect(res.status).toEqual(200);
  });
});

describe('#collections.info', async () => {
  it('should return collection', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/collections.info', {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(collection.id);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/collections.info');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { collection } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/collections.info', {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    expect(res.status).toEqual(403);
  });
});

describe('#collections.create', async () => {
  it('should require authentication', async () => {
    const res = await server.post('/api/collections.create');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should create collection', async () => {
    const { user } = await seed();
    const res = await server.post('/api/collections.create', {
      body: { token: user.getJwtToken(), name: 'Test', type: 'atlas' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toBeTruthy();
    expect(body.data.name).toBe('Test');
  });
});

describe('#collections.delete', async () => {
  it('should require authentication', async () => {
    const res = await server.post('/api/collections.delete');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { collection } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/collections.delete', {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    expect(res.status).toEqual(403);
  });

  it('should not delete last collection', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/collections.delete', {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    expect(res.status).toEqual(400);
  });

  it('should delete collection', async () => {
    const { user, collection } = await seed();
    await Collection.create({
      name: 'Blah',
      urlId: 'blah',
      teamId: user.teamId,
      creatorId: user.id,
      type: 'atlas',
    });

    const res = await server.post('/api/collections.delete', {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toBe(true);
  });
});
