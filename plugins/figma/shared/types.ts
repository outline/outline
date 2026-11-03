declare module "@shared/types" {
  interface LinkedAccountIntegrationSettings {
    figma?: {
      account: {
        id: string;
        name: string;
        email: string;
        avatarUrl: string;
      };
    };
  }
}

export {};
