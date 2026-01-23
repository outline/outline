import { IntegrationService, IntegrationType } from "@shared/types";
import Integration from "./Integration";
import stores from "~/stores";

describe("Integration model", () => {
  const integrations = stores.integrations;

  describe("shouldHideEmbed", () => {
    test("should return false for non-Linear integration", () => {
      const integration = new Integration(
        {
          id: "1",
          service: IntegrationService.Slack,
          type: IntegrationType.Embed,
          settings: {},
        },
        integrations
      );
      expect(integration.shouldHideEmbed).toBe(false);
    });

    test("should return false for Linear integration without hideEmbedOption", () => {
      const integration = new Integration(
        {
          id: "2",
          service: IntegrationService.Linear,
          type: IntegrationType.Embed,
          settings: {
            linear: {
              workspace: { id: "ws1", name: "Test", key: "TEST" },
            },
          },
        },
        integrations
      );
      expect(integration.shouldHideEmbed).toBe(false);
    });

    test("should return false for Linear integration with hideEmbedOption set to false", () => {
      const integration = new Integration(
        {
          id: "3",
          service: IntegrationService.Linear,
          type: IntegrationType.Embed,
          settings: {
            linear: {
              workspace: { id: "ws1", name: "Test", key: "TEST" },
              hideEmbedOption: false,
            },
          },
        },
        integrations
      );
      expect(integration.shouldHideEmbed).toBe(false);
    });

    test("should return true for Linear integration with hideEmbedOption set to true", () => {
      const integration = new Integration(
        {
          id: "4",
          service: IntegrationService.Linear,
          type: IntegrationType.Embed,
          settings: {
            linear: {
              workspace: { id: "ws1", name: "Test", key: "TEST" },
              hideEmbedOption: true,
            },
          },
        },
        integrations
      );
      expect(integration.shouldHideEmbed).toBe(true);
    });

    test("should return false for Linear integration with empty settings", () => {
      const integration = new Integration(
        {
          id: "5",
          service: IntegrationService.Linear,
          type: IntegrationType.Embed,
          settings: {},
        },
        integrations
      );
      expect(integration.shouldHideEmbed).toBe(false);
    });

    test("should return false for Linear integration with null settings", () => {
      const integration = new Integration(
        {
          id: "6",
          service: IntegrationService.Linear,
          type: IntegrationType.Embed,
          settings: null,
        },
        integrations
      );
      expect(integration.shouldHideEmbed).toBe(false);
    });
  });
});
