declare module "@shared/types" {
  interface EmbedIntegrationSettings {
    gitea?: {
      url: string;
      installation?: {
        id: number;
        account: { id: number; name: string; avatarUrl: string };
      };
    };
  }
}

export {};
