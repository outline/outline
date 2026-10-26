declare module "@shared/types" {
  interface EmbedIntegrationSettings {
    gitlab?: {
      url?: string;
      installation?: {
        id: number;
        account: { id: number; name: string; avatarUrl: string };
      };
    };
  }
}

export {};
