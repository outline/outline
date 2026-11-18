declare module "@shared/types" {
  interface EmbedIntegrationSettings {
    github?: {
      installation: {
        id: number;
        account: { id: number; name: string; avatarUrl: string };
      };
    };
  }
}

export {};
