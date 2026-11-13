import { randomUUID } from "node:crypto";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import Koa from "koa";
import { TeamPreference } from "@shared/types";
import { buildTeam } from "@server/test/factories";
import { setSelfHosted } from "@server/test/support";
import {
  getWorkspaceRedirectUrl,
  getWorkspaceRenderOptions,
} from "./workspace";

function buildContext(url: string) {
  const { host, pathname, search } = new URL(url);
  const req = new IncomingMessage(new Socket());
  req.method = "GET";
  req.url = pathname + search;
  req.headers = { host };
  return new Koa().createContext(req, new ServerResponse(req));
}

describe("getWorkspaceRedirectUrl", () => {
  it("should return undefined on the canonical host", async () => {
    const subdomain = `canonical-${randomUUID()}`;
    const team = await buildTeam({ subdomain });
    const ctx = buildContext(`https://${subdomain}.outline.dev/search`);

    expect(await getWorkspaceRedirectUrl(ctx, team)).toBeUndefined();
  });

  it("should return the canonical url with the path and query", async () => {
    const id = randomUUID();
    const team = await buildTeam({
      subdomain: `current-${id}`,
      previousSubdomains: [`previous-${id}`],
    });
    const ctx = buildContext(
      `https://previous-${id}.outline.dev/search?query=hello`
    );

    expect(await getWorkspaceRedirectUrl(ctx, team)).toEqual(
      `https://current-${id}.outline.dev/search?query=hello`
    );
  });

  it("should not redirect a suspended workspace to its canonical url", async () => {
    const id = randomUUID();
    const team = await buildTeam({
      subdomain: `current-${id}`,
      previousSubdomains: [`previous-${id}`],
      suspendedAt: new Date(),
    });
    const ctx = buildContext(`https://previous-${id}.outline.dev/search`);

    expect(await getWorkspaceRedirectUrl(ctx, team)).toBeUndefined();
  });

  it("should return undefined without a workspace or sessions", async () => {
    const ctx = buildContext("https://app.outline.dev/settings");

    expect(await getWorkspaceRedirectUrl(ctx, undefined)).toBeUndefined();
  });

  it("should return undefined when self hosted", async () => {
    setSelfHosted();
    const team = await buildTeam({ subdomain: `self-${randomUUID()}` });
    const ctx = buildContext("https://other.example.com/search");

    expect(await getWorkspaceRedirectUrl(ctx, team)).toBeUndefined();
  });
});

describe("getWorkspaceRenderOptions", () => {
  it("should return only analytics without public branding", async () => {
    const team = await buildTeam({ description: "A description" });

    expect(await getWorkspaceRenderOptions(team)).toEqual({ analytics: [] });
  });

  it("should return only analytics without a workspace", async () => {
    expect(await getWorkspaceRenderOptions(undefined)).toEqual({
      analytics: [],
    });
  });

  it("should return the workspace name and description with public branding", async () => {
    const team = await buildTeam({
      description: "A description",
      preferences: { [TeamPreference.PublicBranding]: true },
    });

    expect(await getWorkspaceRenderOptions(team)).toEqual({
      analytics: [],
      title: team.name,
      description: "A description",
      shortcutIcon: undefined,
    });
  });
});
