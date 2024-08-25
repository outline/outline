export const MattermostApi = {
  User: "/api/v4/users/me",
  UserTeams: "/api/v4/users/me/teams",
  TeamChannels: (teamId: string) => `/api/v4/users/me/teams/${teamId}/channels`,
  CreateWebhook: "/api/v4/hooks/incoming",
  PostWebhook: (webhookId: string) => `/hooks/${webhookId}`,
  DeleteWebhook: (webhookId: string) => `/api/v4/hooks/incoming/${webhookId}`,
};
