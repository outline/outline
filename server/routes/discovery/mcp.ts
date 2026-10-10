import Router from "koa-router";
import { TeamPreference } from "@shared/types";
import env from "@server/env";
import { OAuthHelper } from "@server/utils/oauth/OAuthHelper";
import { getTeamFromContext } from "@server/utils/passport";

const router = new Router();

router.get(
  [
    "/.well-known/oauth-authorization-server",
    "/.well-known/oauth-authorization-server/mcp",
  ],
  async (ctx) => {
    const origin = OAuthHelper.getIssuer(ctx);
    const team = await getTeamFromContext(ctx, { includeOAuthState: false });
    const mcpEnabled = team?.getPreference(TeamPreference.MCP) ?? true;

    ctx.body = {
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/oauth/token`,
      revocation_endpoint: `${origin}/oauth/revoke`,
      // Registration needs a workspace, so it is not offered on the root
      // domain. Clients there use a client ID metadata document instead.
      ...(!env.OAUTH_DISABLE_DCR &&
        team &&
        mcpEnabled && {
          registration_endpoint: `${origin}/oauth/register`,
        }),
      client_id_metadata_document_supported: mcpEnabled,
      response_types_supported: OAuthHelper.responseTypes,
      grant_types_supported: OAuthHelper.grantTypes,
      token_endpoint_auth_methods_supported:
        OAuthHelper.tokenEndpointAuthMethods,
      code_challenge_methods_supported: ["S256"],
      scopes_supported: OAuthHelper.mcpScopes,
    };
  }
);

router.get(
  [
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/mcp",
  ],
  async (ctx) => {
    const team = await getTeamFromContext(ctx, { includeOAuthState: false });
    const mcpEnabled = team?.getPreference(TeamPreference.MCP) ?? true;

    if (!mcpEnabled) {
      ctx.status = 404;
      return;
    }

    const origin = OAuthHelper.getIssuer(ctx);

    ctx.body = {
      resource: `${origin}/mcp`,
      authorization_servers: [origin],
      scopes_supported: OAuthHelper.mcpScopes,
      bearer_methods_supported: ["header"],
    };
  }
);

// MCP clients sometimes probe the origin for a legacy HTTP+SSE endpoint. The
// application shell is not a valid response to that probe, so answer with a 404.
router.get("/sse", (ctx) => {
  ctx.status = 404;
});

export default router;
