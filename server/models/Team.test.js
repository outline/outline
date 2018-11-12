/* eslint-disable flowtype/require-valid-file-annotation */
import { flushdb } from '../test/support';
import { buildTeam } from '../test/factories';

beforeEach(flushdb);

it('should set subdomain if available', async () => {
  const team = await buildTeam();
  const subdomain = await team.provisionSubdomain('testy');
  expect(subdomain).toEqual('testy');
  expect(team.subdomain).toEqual('testy');
});

it('should set subdomain with append if unavailable', async () => {
  const team = await buildTeam({ subdomain: 'myteam' });
  const subdomain = await team.provisionSubdomain('myteam');
  expect(subdomain).toEqual('myteam1');
  expect(team.subdomain).toEqual('myteam1');
});
