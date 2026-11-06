import type { ChatAccountSettings } from "@shared/types";

declare module "@shared/types" {
  interface LinkedAccountIntegrationSettings {
    slack?: ChatAccountSettings;
  }
}
