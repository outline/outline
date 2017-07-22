import TestServer from 'fetch-test-server';
import app from '..';
import { flushdb, seed } from '../test/support';

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

describe('#collections.info', async () => {
  it('should require authentication', async () => {
    const res = await server.post('/api/collections.info');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should return collection', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/collections.info', {
      body: { token: user.getJwtToken(), id: collection.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(collection.id);
  });
});

describe('#collections.create', async () => {
  it('should require authentication', async () => {
    const res = await server.post('/api/collections.create');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should update collection', async () => {
    const { user, collection } = await seed();
    const res = await server.post('/api/collections.update', {
      body: { token: user.getJwtToken(), id: collection.id, name: 'Test' },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toBe(collection.id);
    expect(body.data.name).toBe('Test');
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
