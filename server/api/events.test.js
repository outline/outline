/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '../app';
import { flushdb, seed } from '../test/support';
import { buildEvent } from '../test/factories';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#events.list', async () => {
  it('should only return activity events', async () => {
    const { user, admin, document, collection } = await seed();

    // private event
    await buildEvent({
      name: 'users.promote',
      teamId: user.teamId,
      actorId: admin.id,
      userId: user.id,
    });

    // event viewable in activity stream
    const event = await buildEvent({
      name: 'documents.publish',
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: admin.id,
    });
    const res = await server.post('/api/events.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it('should return events with deleted actors', async () => {
    const { user, admin, document, collection } = await seed();

    // event viewable in activity stream
    const event = await buildEvent({
      name: 'documents.publish',
      collectionId: collection.id,
      documentId: document.id,
      teamId: user.teamId,
      actorId: user.id,
    });

    await user.destroy();

    const res = await server.post('/api/events.list', {
      body: { token: admin.getJwtToken() },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(event.id);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/events.list');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});
