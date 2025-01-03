import {
  buildAdmin,
  buildUser,
  buildWebhookSubscription,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#webhookSubscriptions.list", () => {
  it("should fail with status 401 unauthorized when user token is missing", async () => {
    const res = await server.post("/api/webhookSubscriptions.list", {
      body: {},
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body.message).toEqual("Authentication required");
  });

  it("should fail with status 403 forbidden for non-admin user", async () => {
    const user = await buildUser();

    const res = await server.post("/api/webhookSubscriptions.list", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Admin role required");
  });

  it("should return the webhook subscriptions for the user's team", async () => {
    const user = await buildAdmin();
    const webhookSubscriptions = await Promise.all(
      Array(20)
        .fill(1)
        .map(() =>
          buildWebhookSubscription({
            createdById: user.id,
            teamId: user.teamId,
          })
        )
    );

    const res = await server.post("/api/webhookSubscriptions.list", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(webhookSubscriptions.length);
  });
});

describe("#webhookSubscriptions.create", () => {
  it("should fail with status 401 unauthorized when user token is missing", async () => {
    const res = await server.post("/api/webhookSubscriptions.create", {
      body: {},
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body.message).toEqual("Authentication required");
  });

  it("should fail with status 403 forbidden for non-admin user", async () => {
    const user = await buildUser();

    const res = await server.post("/api/webhookSubscriptions.create", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Admin role required");
  });

  it("should successfully create a webhook subscription", async () => {
    const user = await buildAdmin();
    const name = "Test webhook";
    const url = "https://www.example.com";
    const events = ["comments"];
    const secret = "Test secret";

    const res = await server.post("/api/webhookSubscriptions.create", {
      body: {
        token: user.getJwtToken(),
        name,
        url,
        events,
        secret,
      },
    });
    const body = await res.json();
    const webhook = body.data;

    expect(res.status).toEqual(200);
    expect(webhook.name).toEqual(name);
    expect(webhook.url).toEqual(url);
    expect(webhook.events).toEqual(events);
    expect(webhook.secret).toEqual(secret);
    expect(webhook.enabled).toEqual(true);
  });
});

describe("#webhookSubscriptions.update", () => {
  it("should fail with status 401 unauthorized when user token is missing", async () => {
    const res = await server.post("/api/webhookSubscriptions.update", {
      body: {},
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body.message).toEqual("Authentication required");
  });

  it("should fail with status 403 forbidden for non-admin user", async () => {
    const user = await buildUser();

    const res = await server.post("/api/webhookSubscriptions.update", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Admin role required");
  });

  it("should successfully update a webhook subscription", async () => {
    const user = await buildAdmin();
    const name = "Updated webhook name";
    const url = "https://www.example.com/update";
    const events = ["comments"];

    const existingWebhook = await buildWebhookSubscription({
      name: "Created webhook name",
      url: "https://www.example.com/create",
      events: ["*"],
      createdById: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/webhookSubscriptions.update", {
      body: {
        token: user.getJwtToken(),
        id: existingWebhook.id,
        name,
        url,
        events,
      },
    });
    const body = await res.json();
    const webhook = body.data;

    expect(res.status).toEqual(200);
    expect(webhook.name).toEqual(name);
    expect(webhook.url).toEqual(url);
    expect(webhook.events).toEqual(events);
    expect(webhook.enabled).toEqual(true);
  });

  it("should activate a disabled webhook subscription when it's updated", async () => {
    const user = await buildAdmin();
    const name = "Updated webhook name";
    const url = "https://www.example.com/update";
    const events = ["comments"];

    const disabledWebhook = await buildWebhookSubscription({
      name: "Created webhook name",
      url: "https://www.example.com/create",
      events: ["*"],
      createdById: user.id,
      teamId: user.teamId,
      enabled: false,
    });

    const res = await server.post("/api/webhookSubscriptions.update", {
      body: {
        token: user.getJwtToken(),
        id: disabledWebhook.id,
        name,
        url,
        events,
      },
    });
    const body = await res.json();
    const webhook = body.data;

    expect(res.status).toEqual(200);
    expect(webhook.name).toEqual(name);
    expect(webhook.url).toEqual(url);
    expect(webhook.events).toEqual(events);
    expect(webhook.enabled).toEqual(true);
  });
});

describe("#webhookSubscriptions.delete", () => {
  it("should fail with status 401 unauthorized when user token is missing", async () => {
    const res = await server.post("/api/webhookSubscriptions.delete", {
      body: {},
    });
    const body = await res.json();

    expect(res.status).toEqual(401);
    expect(body.message).toEqual("Authentication required");
  });

  it("should fail with status 403 forbidden for non-admin user", async () => {
    const user = await buildUser();

    const res = await server.post("/api/webhookSubscriptions.delete", {
      body: { token: user.getJwtToken() },
    });
    const body = await res.json();

    expect(res.status).toEqual(403);
    expect(body.message).toEqual("Admin role required");
  });

  it("should successfully delete a webhook subscription", async () => {
    const user = await buildAdmin();
    const createdWebhook = await buildWebhookSubscription({
      name: "Test webhook",
      url: "https://www.example.com",
      events: ["*"],
      createdById: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/webhookSubscriptions.delete", {
      body: { token: user.getJwtToken(), id: createdWebhook.id },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });
});
