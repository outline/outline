/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import subMonths from 'date-fns/sub_months';
import app from '../app';
import { Document } from '../models';
import { flushdb, seed } from '../test/support';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

describe('#utils.gc', async () => {
  it('should destroy documents deleted more than 30 days ago', async () => {
    const { document } = await seed();

    await document.delete();
    document.deletedAt = subMonths(new Date(), 2);
    await document.save();

    const res = await server.post('/api/utils.gc', {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });
    const count = await Document.count({
      where: {
        id: document.id,
      },
      paranoid: true,
    });
    expect(res.status).toEqual(200);
    expect(count).toEqual(0);
  });

  it('should require authentication', async () => {
    const res = await server.post('/api/utils.gc');
    expect(res.status).toEqual(401);
  });
});
