declare module "@shared/types" {
  interface LinkedAccountIntegrationSettings {
    slack?: { serviceTeamId: string; serviceUserId: string };
  }
}

export {};
