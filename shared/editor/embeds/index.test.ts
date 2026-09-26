import { IntegrationService } from "../../types";
import { EmbedDescriptor } from ".";

describe("EmbedDescriptor", () => {
  const descriptor = () =>
    new EmbedDescriptor({
      id: "diagrams",
      title: "Diagrams.net",
      name: IntegrationService.Diagrams,
      regexMatch: [/^https:\/\/viewer\.diagrams\.net\/(?!proxy).*/],
    });

  it("matches the built-in domain without settings", () => {
    expect(
      descriptor().matcher("https://viewer.diagrams.net/?lightbox=1#R123")
    ).toBeTruthy();
    expect(descriptor().matcher("https://drawio.example.com/#R123")).toBe(
      false
    );
  });

  it("matches the installation url nested under the service name", () => {
    const embed = descriptor();
    embed.settings = { diagrams: { url: "https://drawio.example.com/" } };

    expect(
      embed.matcher("https://drawio.example.com/?lightbox=1#R123")
    ).toBeTruthy();
    expect(embed.matcher("https://viewer.diagrams.net/#R123")).toBeTruthy();
    expect(embed.matcher("https://other.example.com/#R123")).toBe(false);
  });

  it("matches a flat installation url", () => {
    const embed = descriptor();
    embed.settings = { url: "https://drawio.example.com/" };

    expect(embed.matcher("https://drawio.example.com/#R123")).toBeTruthy();
  });

  it("does not match once the settings are removed", () => {
    const embed = descriptor();
    embed.settings = { diagrams: { url: "https://drawio.example.com/" } };
    expect(embed.matcher("https://drawio.example.com/#R123")).toBeTruthy();

    embed.settings = undefined;
    expect(embed.matcher("https://drawio.example.com/#R123")).toBe(false);
  });
});
