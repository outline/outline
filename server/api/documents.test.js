import TestServer from 'fetch-test-server';
import app from '..';
import { View } from '../models';
import { flushdb, seed } from '../test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(() => server.close());

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
    await seed();
    const res = await server.post('/api/documents.list');
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

  it('should require authentication', async () => {
    await seed();
    const res = await server.post('/api/documents.viewed');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});
