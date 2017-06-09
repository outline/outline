import TestServer from 'fetch-test-server';
import app from '..';
import { flushdb, seed } from '../test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(() => server.close());

describe('#documents.list', async () => {
  it('should return documents', async () => {
    const { user } = await seed();
    const res = await server.post('/api/documents.list', {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
  });

  it('should require authentication', async () => {
    await seed();
    const res = await server.post('/api/documents.list');
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });
});
