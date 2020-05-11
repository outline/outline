/* eslint-disable flowtype/require-valid-file-annotation */
import { flushdb } from '../test/support';
import { Document } from '../models';
import { buildDocument, buildCollection, buildTeam } from '../test/factories';

beforeEach(flushdb);
beforeEach(jest.resetAllMocks);

describe('#searchForTeam', () => {
  test('should return search results from public collections', async () => {
    const team = await buildTeam();
    const collection = await buildCollection({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      title: 'test',
    });

    const results = await Document.searchForTeam(team, 'test');
    expect(results.length).toBe(1);
    expect(results[0].document.id).toBe(document.id);
  });

  test('should not return search results from private collections', async () => {
    const team = await buildTeam();
    const collection = await buildCollection({
      private: true,
      teamId: team.id,
    });
    await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
      title: 'test',
    });

    const results = await Document.searchForTeam(team, 'test');
    expect(results.length).toBe(0);
  });

  test('should handle no collections', async () => {
    const team = await buildTeam();
    const results = await Document.searchForTeam(team, 'test');
    expect(results.length).toBe(0);
  });
});
