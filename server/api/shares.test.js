/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '..';
import { flushdb, seed } from '../test/support';
import { buildUser } from '../test/factories';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#shares.list', async () => {
  it('should return a list of shares', async () => {
    const { user } = await seed();
    const res = await server.post('/api/shares.list', {
      body: { token: user.getJwtToken() },
    });
    expect(res.status).toEqual(200);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/shares.list');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});

describe('#shares.create', async () => {
  it('should allow creating a share record for document', async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/shares.create', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.documentTitle).toBe(document.title);
  });

  it('should require authentication', async () => {
    const { document } = await seed();
    const res = await server.post('/api/shares.create', {
      body: { id: document.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/shares.create', {
      body: { token: user.getJwtToken(), id: document.id },
    });
    expect(res.status).toEqual(403);
  });
});
