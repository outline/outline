declare module "@shared/types" {
  interface EmbedIntegrationSettings {
    kroki?: {
      url: string;
      enabledFormats?: string[];
    };
  }
}

export {};
