/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '..';
import { flushdb } from '../test/support';
import { buildDocument, buildUser } from '../test/factories';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe.only('#tags.list', async () => {
  it('should return tags contained in team documents', async () => {
    const user = await buildUser();
    const text = `
# Title
oooh a #hashtag
`;
    await buildDocument({
      userId: user.id,
      teamId: user.teamId,
      text,
    });
    await buildDocument({
      text: 'a #tag in #another team',
    });
    const res = await server.post('/api/tags.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].name).toEqual('hashtag');
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/tags.list');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});
