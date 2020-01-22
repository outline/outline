/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '../app';
import { flushdb, seed } from '../test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#attachments.redirect', async () => {
  it('should require authentication', async () => {
    const res = await server.post('/api/attachments.redirect');
    expect(res.status).toEqual(401);
  });

  it('should return a redirect for an attachment belonging to a document user has access to', async () => {
    const { user, attachment } = await seed();
    const res = await server.post('/api/attachments.redirect', {
      body: { token: user.getJwtToken(), id: attachment.id },
    });

    expect(res.status).toEqual(302);
  });

  it('should always return a redirect for a public attachment', async () => {
    const { user, collection, attachment } = await seed();
    collection.private = true;
    await collection.save();

    const res = await server.post('/api/attachments.redirect', {
      body: { token: user.getJwtToken(), id: attachment.id },
    });

    expect(res.status).toEqual(302);
  });

  it('should not return a redirect for a private attachment belonging to a document user does not have access to', async () => {
    const { user, collection, attachment } = await seed();
    collection.private = true;
    await collection.save();
    attachment.acl = 'private';
    await attachment.save();

    const res = await server.post('/api/attachments.redirect', {
      body: { token: user.getJwtToken(), id: attachment.id },
    });

    expect(res.status).toEqual(403);
  });
});
