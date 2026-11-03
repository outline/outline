declare module "@shared/types" {
  interface EmbedIntegrationSettings {
    linear?: {
      workspace: { id: string; name: string; key: string; logoUrl?: string };
    };
  }
}

export {};
