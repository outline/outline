import { createHash, randomBytes } from "node:crypto";
import { isoBase64URL, isoCBOR } from "@simplewebauthn/server/helpers";
import { Plan } from "@shared/types";
import { Team } from "@server/models";
import {
  buildAdmin,
  buildApiKey,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import type { APIContext } from "@server/types";
import { PasskeyBrand } from "@shared/utils/passkeys";
import {
  getExpectedOrigin,
  getPasskeyLoginRedirect,
  isUniqueAuthenticator,
} from "./passkeys";

const server = getTestServer();

/**
 * Builds the response of an authenticator that registers a credential without
 * an attestation statement, which does not require any signature.
 *
 * @param challenge the challenge from the registration options.
 * @param rpId the relying party ID from the registration options.
 * @returns the WebAuthn registration response.
 */
function buildNoneAttestationResponse(challenge: string, rpId: string) {
  const credentialId = randomBytes(32);
  // An EC2 P-256 key with the ES256 algorithm, encoded as COSE.
  const publicKey = isoCBOR.encode(
    new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, new Uint8Array(32).fill(1)],
      [-3, new Uint8Array(32).fill(2)],
    ])
  );
  const credentialIdLength = Buffer.alloc(2);
  credentialIdLength.writeUInt16BE(credentialId.length);
  const authData = Buffer.concat([
    createHash("sha256").update(rpId).digest(),
    // The user present and attested credential data flags.
    Buffer.from([0x41]),
    // The signature counter.
    Buffer.alloc(4),
    // The AAGUID.
    Buffer.alloc(16),
    credentialIdLength,
    credentialId,
    publicKey,
  ]);
  const clientData = {
    type: "webauthn.create",
    challenge,
    origin: server.address,
  };
  const id = isoBase64URL.fromBuffer(credentialId);

  return {
    id,
    rawId: id,
    type: "public-key",
    clientExtensionResults: {},
    response: {
      clientDataJSON: isoBase64URL.fromUTF8String(JSON.stringify(clientData)),
      attestationObject: isoBase64URL.fromBuffer(
        isoCBOR.encode(
          new Map<string, string | Uint8Array | Map<string, string>>([
            ["fmt", "none"],
            ["attStmt", new Map<string, string>()],
            ["authData", authData],
          ])
        )
      ),
      transports: ["internal"],
    },
  };
}

describe("getExpectedOrigin", () => {
  // Helper to mock APIContext for testing
  const createMockContext = (options: {
    protocol: string;
    hostname: string;
    host: string;
    forwardedPort?: string;
  }): APIContext =>
    ({
      protocol: options.protocol,
      request: {
        hostname: options.hostname,
        host: options.host,
        get: (header: string) => {
          if (header === "X-Forwarded-Port" && options.forwardedPort) {
            return options.forwardedPort;
          }
          return undefined;
        },
      } as unknown,
    }) as unknown as APIContext;

  it("should construct origin with non-standard HTTPS port from X-Forwarded-Port", () => {
    const ctx = createMockContext({
      protocol: "https",
      hostname: "outline.example.com",
      host: "outline.example.com", // Without port (from X-Forwarded-Host)
      forwardedPort: "10081",
    });

    expect(getExpectedOrigin(ctx)).toBe("https://outline.example.com:10081");
  });

  it("should construct origin without port for standard HTTPS port (443)", () => {
    const ctx = createMockContext({
      protocol: "https",
      hostname: "outline.example.com",
      host: "outline.example.com",
      forwardedPort: "443",
    });

    expect(getExpectedOrigin(ctx)).toBe("https://outline.example.com");
  });

  it("should construct origin without port for standard HTTP port (80)", () => {
    const ctx = createMockContext({
      protocol: "http",
      hostname: "outline.example.com",
      host: "outline.example.com",
      forwardedPort: "80",
    });

    expect(getExpectedOrigin(ctx)).toBe("http://outline.example.com");
  });

  it("should use host with port when X-Forwarded-Port is not present", () => {
    const ctx = createMockContext({
      protocol: "https",
      hostname: "outline.example.com",
      host: "outline.example.com:8443",
    });

    expect(getExpectedOrigin(ctx)).toBe("https://outline.example.com:8443");
  });

  it("should construct origin without port when not in host and no X-Forwarded-Port", () => {
    const ctx = createMockContext({
      protocol: "https",
      hostname: "outline.example.com",
      host: "outline.example.com",
    });

    expect(getExpectedOrigin(ctx)).toBe("https://outline.example.com");
  });

  it("should handle HTTP with non-standard port", () => {
    const ctx = createMockContext({
      protocol: "http",
      hostname: "outline.example.com",
      host: "outline.example.com",
      forwardedPort: "8080",
    });

    expect(getExpectedOrigin(ctx)).toBe("http://outline.example.com:8080");
  });
});

describe("getPasskeyLoginRedirect", () => {
  it("should redirect to the desktop passkey flow when client=desktop", () => {
    expect(getPasskeyLoginRedirect("desktop")).toBe(
      "/?method=passkey&client=desktop"
    );
  });

  it("should default to the web client when client is missing", () => {
    expect(getPasskeyLoginRedirect(undefined)).toBe(
      "/?method=passkey&client=web"
    );
  });

  it("should default to the web client when client is invalid", () => {
    expect(getPasskeyLoginRedirect("bogus")).toBe(
      "/?method=passkey&client=web"
    );
  });

  it("should default to the web client when client is an array", () => {
    expect(getPasskeyLoginRedirect(["desktop", "web"])).toBe(
      "/?method=passkey&client=web"
    );
  });
});

describe("isUniqueAuthenticator", () => {
  it("should be true for a known authenticator", () => {
    expect(isUniqueAuthenticator(PasskeyBrand.OnePassword)).toBe(true);
  });

  it("should be false for the Chromium authenticator", () => {
    expect(isUniqueAuthenticator(PasskeyBrand.ChromiumBrowser)).toBe(false);
  });

  it("should be false for a missing or zero AAGUID", () => {
    expect(isUniqueAuthenticator(undefined)).toBe(false);
    expect(isUniqueAuthenticator("00000000-0000-0000-0000-000000000000")).toBe(
      false
    );
  });
});

describe("#passkeys.generateRegistrationOptions", () => {
  it("should return registration options for a session", async () => {
    const team = await buildTeam({ passkeysEnabled: true });
    const user = await buildUser({ teamId: team.id });
    const res = await server.post(
      "/auth/passkeys.generateRegistrationOptions",
      user
    );
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.challenge).toBeTruthy();
  });

  it("should not allow an API key", async () => {
    const team = await buildTeam({ passkeysEnabled: true });
    const user = await buildUser({ teamId: team.id });
    const apiKey = await buildApiKey({ userId: user.id });
    const res = await server.post(
      "/auth/passkeys.generateRegistrationOptions",
      {
        headers: { authorization: `Bearer ${apiKey.value}` },
      }
    );

    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Invalid authentication type");
  });
});

describe("#passkeys.verifyRegistration", () => {
  it("should not allow an API key", async () => {
    const team = await buildTeam({ passkeysEnabled: true });
    const user = await buildUser({ teamId: team.id });
    const apiKey = await buildApiKey({ userId: user.id });
    const res = await server.post("/auth/passkeys.verifyRegistration", {
      headers: { authorization: `Bearer ${apiKey.value}` },
      body: {},
    });

    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Invalid authentication type");
  });

  it("should consume the challenge on a failed attempt", async () => {
    const team = await buildTeam({ passkeysEnabled: true });
    const user = await buildUser({ teamId: team.id });

    const options = await server.post(
      "/auth/passkeys.generateRegistrationOptions",
      user
    );
    const { data } = await options.json();

    const failed = await server.post(
      "/auth/passkeys.verifyRegistration",
      user,
      {
        body: buildNoneAttestationResponse(
          isoBase64URL.fromBuffer(randomBytes(32)),
          data.rp.id
        ),
      }
    );
    expect(failed.status).toEqual(400);

    const res = await server.post("/auth/passkeys.verifyRegistration", user, {
      body: buildNoneAttestationResponse(data.challenge, data.rp.id),
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual(
      "No registration challenge found or challenge expired"
    );
  });

  it("should record the registration in the audit log", async () => {
    const planSpy = vi
      .spyOn(Team.prototype, "plan", "get")
      .mockReturnValue(Plan.Business);
    const team = await buildTeam({ passkeysEnabled: true });
    const admin = await buildAdmin({ teamId: team.id });

    const options = await server.post(
      "/auth/passkeys.generateRegistrationOptions",
      admin
    );
    const { data } = await options.json();

    const res = await server.post("/auth/passkeys.verifyRegistration", admin, {
      body: buildNoneAttestationResponse(data.challenge, data.rp.id),
    });
    expect(res.status).toEqual(200);

    const list = await server.post("/api/events.list", admin, {
      body: { auditLog: true, name: "passkeys.create" },
    });
    const body = await list.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].actorId).toEqual(admin.id);
    expect(body.data[0].userId).toEqual(admin.id);
    expect(body.data[0].changes.attributes.name).toBeTruthy();
    expect(body.data[0].changes.attributes.credentialPublicKey).toBeUndefined();

    planSpy.mockRestore();
  });
});

describe("#passkeys.verifyAuthentication", () => {
  it("should consume the challenge on a failed attempt", async () => {
    const options = await server.post(
      "/auth/passkeys.generateAuthenticationOptions",
      { body: {} }
    );
    const { data } = await options.json();
    const body = {
      challengeId: data.challengeId,
      id: "unknown",
      rawId: "unknown",
      response: {
        authenticatorData: "",
        clientDataJSON: "",
        signature: "",
      },
      type: "public-key",
    };

    const failed = await server.post("/auth/passkeys.verifyAuthentication", {
      body,
    });
    const failedBody = await failed.json();
    expect(failed.status).toEqual(400);
    expect(failedBody.message).toContain("Passkey not found");

    const res = await server.post("/auth/passkeys.verifyAuthentication", {
      body,
    });
    const resBody = await res.json();
    expect(res.status).toEqual(400);
    expect(resBody.message).toEqual(
      "No authentication challenge found or challenge expired"
    );
  });
});
