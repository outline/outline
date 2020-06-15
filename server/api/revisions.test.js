/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '../app';
import { flushdb, seed } from '../test/support';
import { buildUser } from '../test/factories';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#revisions.info', async () => {
  it("should return a document's revisions", async () => {
    const { user, document } = await seed();
    const res = await server.post('/api/revisions.info', {
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

  it('should not return revisions for document in collection not a member of', async () => {
    const { user, document, collection } = await seed();
    collection.private = true;
    await collection.save();

    const res = await server.post('/api/revisions.info', {
      body: { token: user.getJwtToken(), id: document.id },
    });

    expect(res.status).toEqual(403);
  });

  it('should require authorization', async () => {
    const { document } = await seed();
    const user = await buildUser();
    const res = await server.post('/api/revisions.info', {
      body: {
        token: user.getJwtToken(),
        id: document.id,
      },
    });
    expect(res.status).toEqual(403);
  });
});
