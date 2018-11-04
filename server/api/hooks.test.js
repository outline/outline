/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from 'fetch-test-server';
import app from '..';
import { Authentication } from '../models';
import { flushdb, seed } from '../test/support';
import { buildDocument, buildUser } from '../test/factories';
import * as Slack from '../slack';

const server = new TestServer(app.callback());

beforeEach(flushdb);
afterAll(server.close);

jest.mock('../slack', () => ({
  post: jest.fn(),
}));

describe('#hooks.unfurl', async () => {
  it('should return documents', async () => {
    const { user, document } = await seed();
    await Authentication.create({
      service: 'slack',
      userId: user.id,
      teamId: user.teamId,
      token: '',
    });

    const res = await server.post('/api/hooks.unfurl', {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        team_id: 'TXXXXXXXX',
        api_app_id: 'AXXXXXXXXX',
        event: {
          type: 'link_shared',
          channel: 'Cxxxxxx',
          user: user.serviceId,
          message_ts: '123456789.9875',
          links: [
            {
              domain: 'getoutline.com',
              url: document.url,
            },
          ],
        },
      },
    });
    expect(res.status).toEqual(200);
    expect(Slack.post).toHaveBeenCalled();
  });
});

describe('#hooks.slack', async () => {
  it('should return no matches', async () => {
    const { user } = await seed();

    const res = await server.post('/api/hooks.slack', {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: user.serviceId,
        text: 'dsfkndfskndsfkn',
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.attachments).toEqual(undefined);
  });

  it('should return search results with summary if query is in title', async () => {
    const user = await buildUser();
    const document = await buildDocument({
      title: 'This title contains a search term',
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post('/api/hooks.slack', {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: user.serviceId,
        text: 'contains',
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
    expect(body.attachments[0].text).toEqual(document.getSummary());
  });

  it('should return search results with snippet if query is in text', async () => {
    const user = await buildUser();
    const document = await buildDocument({
      text: 'This title contains a search term',
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post('/api/hooks.slack', {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: user.serviceId,
        text: 'contains',
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.attachments.length).toEqual(1);
    expect(body.attachments[0].title).toEqual(document.title);
    expect(body.attachments[0].text).toEqual(
      'This title *contains* a search term'
    );
  });

  it('should error if unknown user', async () => {
    const res = await server.post('/api/hooks.slack', {
      body: {
        token: process.env.SLACK_VERIFICATION_TOKEN,
        user_id: 'not-a-user-id',
        text: 'Welcome',
      },
    });
    expect(res.status).toEqual(400);
  });

  it('should error if incorrect verification token', async () => {
    const { user } = await seed();

    const res = await server.post('/api/hooks.slack', {
      body: {
        token: 'wrong-verification-token',
        user_id: user.serviceId,
        text: 'Welcome',
      },
    });
    expect(res.status).toEqual(401);
  });
});
