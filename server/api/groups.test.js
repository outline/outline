/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '../app';
import { flushdb } from '../test/support';
import { buildUser } from '../test/factories';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#groups.create', async () => {
  it('should create a group', async () => {
    const name = 'hello I am a group';
    const user = await buildUser();

    const res = await server.post('/api/groups.create', {
      body: { token: user.getJwtToken(), name },
    });

    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.name).toEqual(name);
  });
});
