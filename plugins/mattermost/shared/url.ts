export const userDetailsUrl = ({ serverUrl }: { serverUrl: string }) =>
  `${serverUrl}/api/v4/users/me`;

export const userTeamsUrl = ({ serverUrl }: { serverUrl: string }) =>
  `${serverUrl}/api/v4/users/me/teams`;
