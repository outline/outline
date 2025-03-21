import {
  buildUser,
  buildTemplate,
  buildCollection,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#templates.list", () => {
  it("should list templates", async () => {
    const user = await buildUser();
    await buildTemplate(); // create a template that shouldn't be included

    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.list", {
      body: {
        token: user.getJwtToken(),
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(template.id);
  });

  it("should list templates in collection", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });

    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
    });

    const res = await server.post("/api/templates.list", {
      body: {
        token: user.getJwtToken(),
        collectionId: collection.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].id).toEqual(template.id);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.list");
    expect(res.status).toEqual(401);
  });
});

describe("#templates.info", () => {
  it("should return template data", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.info", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(template.id);
    expect(body.data.title).toEqual(template.title);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.info");
    expect(res.status).toEqual(401);
  });

  it("should fail for invalid template id", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.info", {
      body: {
        token: user.getJwtToken(),
        id: "invalid",
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("#templates.update", () => {
  it("should update template title", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      title: "Original title",
    });

    const res = await server.post("/api/templates.update", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
        title: "New title",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.title).toEqual("New title");
  });

  it("should update template content", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      text: "Original content",
    });

    const data = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "hello",
            },
          ],
        },
      ],
    };

    const res = await server.post("/api/templates.update", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
        data,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.data).toEqual(data);
  });

  it("should fail with status 400 bad request when id is missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.update", {
      body: {
        token: user.getJwtToken(),
        title: "New title",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Must be a valid UUID or slug");
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.update");
    expect(res.status).toEqual(401);
  });
});

describe("#templates.duplicate", () => {
  it("should duplicate template", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
      title: "test",
    });

    const res = await server.post("/api/templates.duplicate", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).not.toEqual(template.id);
    expect(body.data.title).toEqual(template.title);
    expect(body.data.data).toEqual(template.content);
  });

  it("should duplicate template with new title", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.duplicate", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
        title: "New title",
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).not.toEqual(template.id);
    expect(body.data.title).toEqual("New title");
    expect(body.data.data).toEqual(template.content);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.duplicate");
    expect(res.status).toEqual(401);
  });

  it("should fail for invalid template id", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.duplicate", {
      body: {
        token: user.getJwtToken(),
        id: "invalid",
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("#templates.delete", () => {
  it("should delete template", async () => {
    const user = await buildUser();
    const template = await buildTemplate({
      userId: user.id,
      teamId: user.teamId,
    });

    const res = await server.post("/api/templates.delete", {
      body: {
        token: user.getJwtToken(),
        id: template.id,
      },
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
  });

  it("should fail with status 400 bad request when id is missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/templates.delete", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("id: Must be a valid UUID or slug");
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/templates.delete");
    expect(res.status).toEqual(401);
  });
});
