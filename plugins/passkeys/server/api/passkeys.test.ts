import { UserPasskey } from "@server/models";
import {
  buildApiKey,
  buildUser,
  buildUserPasskey,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#passkeys.list", () => {
  it("should list passkeys for a session", async () => {
    const user = await buildUser();
    const passkey = await buildUserPasskey({ userId: user.id });
    const res = await server.post("/api/passkeys.list", user);
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(passkey.id);
  });

  it("should not allow an API key", async () => {
    const user = await buildUser();
    await buildUserPasskey({ userId: user.id });
    const apiKey = await buildApiKey({ userId: user.id });
    const res = await server.post("/api/passkeys.list", {
      headers: { authorization: `Bearer ${apiKey.value}` },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Invalid authentication type");
  });
});

describe("#passkeys.update", () => {
  it("should not allow an API key", async () => {
    const user = await buildUser();
    const passkey = await buildUserPasskey({ userId: user.id });
    const apiKey = await buildApiKey({ userId: user.id });
    const res = await server.post("/api/passkeys.update", {
      headers: { authorization: `Bearer ${apiKey.value}` },
      body: { id: passkey.id, name: "Renamed" },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Invalid authentication type");
    await passkey.reload();
    expect(passkey.name).not.toEqual("Renamed");
  });
});

describe("#passkeys.delete", () => {
  it("should delete a passkey for a session", async () => {
    const user = await buildUser();
    const passkey = await buildUserPasskey({ userId: user.id });
    const res = await server.post("/api/passkeys.delete", user, {
      body: { id: passkey.id },
    });

    expect(res.status).toEqual(200);
    expect(await UserPasskey.findByPk(passkey.id)).toBeNull();
  });

  it("should not allow an API key", async () => {
    const user = await buildUser();
    const passkey = await buildUserPasskey({ userId: user.id });
    const apiKey = await buildApiKey({ userId: user.id });
    const res = await server.post("/api/passkeys.delete", {
      headers: { authorization: `Bearer ${apiKey.value}` },
      body: { id: passkey.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Invalid authentication type");
    expect(await UserPasskey.findByPk(passkey.id)).not.toBeNull();
  });
});
