import {
	buildUser,
	buildAdmin,
	buildDocument,
	buildTag,
	buildDocumentTag,
	buildViewer,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#tags.list", () => {
	it("should require authentication", async () => {
		const res = await server.post("/api/tags.list");
		expect(res.status).toEqual(401);
	});

	it("should return tags for the team", async () => {
		const user = await buildUser();
		const tag = await buildTag({ teamId: user.teamId });
		await buildTag(); // different team – must not appear

		const res = await server.post("/api/tags.list", {
			body: { token: user.getJwtToken() },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.length).toEqual(1);
		expect(body.data[0].id).toEqual(tag.id);
	});

	it("should filter by query", async () => {
		const user = await buildUser();
		await buildTag({ teamId: user.teamId, name: "marketing" });
		await buildTag({ teamId: user.teamId, name: "engineering" });

		const res = await server.post("/api/tags.list", {
			body: { token: user.getJwtToken(), query: "mark" },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.length).toEqual(1);
		expect(body.data[0].name).toEqual("marketing");
	});
});

describe("#tags.create", () => {
	it("should require authentication", async () => {
		const res = await server.post("/api/tags.create");
		expect(res.status).toEqual(401);
	});

	it("should not allow viewers to create tags", async () => {
		const user = await buildViewer();

		const res = await server.post("/api/tags.create", {
			body: { token: user.getJwtToken(), name: "test" },
		});
		expect(res.status).toEqual(403);
	});

	it("should create a tag", async () => {
		const user = await buildUser();

		const res = await server.post("/api/tags.create", {
			body: { token: user.getJwtToken(), name: "ProjectAlpha" },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.name).toEqual("projectalpha");
		expect(body.data.teamId).toEqual(user.teamId);
	});

	it("should normalize tag name to lowercase", async () => {
		const user = await buildUser();

		const res = await server.post("/api/tags.create", {
			body: { token: user.getJwtToken(), name: "UPPERCASE" },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.name).toEqual("uppercase");
	});

	it("should return existing tag if name already exists", async () => {
		const user = await buildUser();
		const existing = await buildTag({ teamId: user.teamId, name: "duplicate" });

		const res = await server.post("/api/tags.create", {
			body: { token: user.getJwtToken(), name: "duplicate" },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.id).toEqual(existing.id);
	});
});

describe("#tags.update", () => {
	it("should require authentication", async () => {
		const res = await server.post("/api/tags.update");
		expect(res.status).toEqual(401);
	});

	it("should not allow non-admin to rename a tag", async () => {
		const user = await buildUser();
		const tag = await buildTag({ teamId: user.teamId });

		const res = await server.post("/api/tags.update", {
			body: { token: user.getJwtToken(), id: tag.id, name: "renamed" },
		});
		expect(res.status).toEqual(403);
	});

	it("should allow admin to rename a tag", async () => {
		const admin = await buildAdmin();
		const tag = await buildTag({ teamId: admin.teamId });

		const res = await server.post("/api/tags.update", {
			body: { token: admin.getJwtToken(), id: tag.id, name: "Renamed Tag" },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.name).toEqual("renamed tag");
	});

	it("should return 404 for tag in different team", async () => {
		const admin = await buildAdmin();
		const tag = await buildTag(); // different team

		const res = await server.post("/api/tags.update", {
			body: { token: admin.getJwtToken(), id: tag.id, name: "x" },
		});
		expect(res.status).toEqual(404);
	});
});

describe("#tags.usage", () => {
	it("should require authentication", async () => {
		const res = await server.post("/api/tags.usage");
		expect(res.status).toEqual(401);
	});

	it("should return usage count for a tag", async () => {
		const user = await buildUser();
		const tag = await buildTag({ teamId: user.teamId });
		const doc = await buildDocument({ userId: user.id, teamId: user.teamId });
		await buildDocumentTag({ documentId: doc.id, tagId: tag.id });

		const res = await server.post("/api/tags.usage", {
			body: { token: user.getJwtToken(), id: tag.id },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.documentCount).toEqual(1);
		expect(body.data.sampleTitles).toContain(doc.title);
	});

	it("should return zero count for unused tag", async () => {
		const user = await buildUser();
		const tag = await buildTag({ teamId: user.teamId });

		const res = await server.post("/api/tags.usage", {
			body: { token: user.getJwtToken(), id: tag.id },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.documentCount).toEqual(0);
	});
});

describe("#tags.delete", () => {
	it("should require authentication", async () => {
		const res = await server.post("/api/tags.delete");
		expect(res.status).toEqual(401);
	});

	it("should not allow non-admin to delete a tag", async () => {
		const user = await buildUser();
		const tag = await buildTag({ teamId: user.teamId });

		const res = await server.post("/api/tags.delete", {
			body: { token: user.getJwtToken(), id: tag.id, confirm: true },
		});
		expect(res.status).toEqual(403);
	});

	it("should return 400 without confirm flag", async () => {
		const admin = await buildAdmin();
		const tag = await buildTag({ teamId: admin.teamId });

		const res = await server.post("/api/tags.delete", {
			body: { token: admin.getJwtToken(), id: tag.id },
		});
		const body = await res.json();

		expect(res.status).toEqual(400);
		expect(body.message).toContain("confirm");
	});

	it("should delete tag and all document_tags with confirm: true", async () => {
		const admin = await buildAdmin();
		const tag = await buildTag({ teamId: admin.teamId });
		const doc = await buildDocument({
			userId: admin.id,
			teamId: admin.teamId,
		});
		await buildDocumentTag({ documentId: doc.id, tagId: tag.id });

		const res = await server.post("/api/tags.delete", {
			body: { token: admin.getJwtToken(), id: tag.id, confirm: true },
		});

		expect(res.status).toEqual(200);
	});
});

describe("#documents.addTag", () => {
	it("should require authentication", async () => {
		const res = await server.post("/api/documents.addTag");
		expect(res.status).toEqual(401);
	});

	it("should add an existing tag by id", async () => {
		const user = await buildUser();
		const doc = await buildDocument({ userId: user.id, teamId: user.teamId });
		const tag = await buildTag({ teamId: user.teamId });

		const res = await server.post("/api/documents.addTag", {
			body: { token: user.getJwtToken(), id: doc.id, tagId: tag.id },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.tags.length).toEqual(1);
		expect(body.data.tags[0].name).toEqual(tag.name);
	});

	it("should upsert and add a tag by name", async () => {
		const user = await buildUser();
		const doc = await buildDocument({ userId: user.id, teamId: user.teamId });

		const res = await server.post("/api/documents.addTag", {
			body: { token: user.getJwtToken(), id: doc.id, name: "newtag" },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.tags.length).toEqual(1);
		expect(body.data.tags[0].name).toEqual("newtag");
	});

	it("should be idempotent – adding same tag twice does not duplicate", async () => {
		const user = await buildUser();
		const doc = await buildDocument({ userId: user.id, teamId: user.teamId });
		const tag = await buildTag({ teamId: user.teamId });

		await server.post("/api/documents.addTag", {
			body: { token: user.getJwtToken(), id: doc.id, tagId: tag.id },
		});
		const res = await server.post("/api/documents.addTag", {
			body: { token: user.getJwtToken(), id: doc.id, tagId: tag.id },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.tags.length).toEqual(1);
	});

	it("should require either tagId or name", async () => {
		const user = await buildUser();
		const doc = await buildDocument({ userId: user.id, teamId: user.teamId });

		const res = await server.post("/api/documents.addTag", {
			body: { token: user.getJwtToken(), id: doc.id },
		});
		expect(res.status).toEqual(400);
	});
});

describe("#documents.removeTag", () => {
	it("should require authentication", async () => {
		const res = await server.post("/api/documents.removeTag");
		expect(res.status).toEqual(401);
	});

	it("should remove a tag from a document", async () => {
		const user = await buildUser();
		const doc = await buildDocument({ userId: user.id, teamId: user.teamId });
		const tag = await buildTag({ teamId: user.teamId });
		await buildDocumentTag({ documentId: doc.id, tagId: tag.id });

		const res = await server.post("/api/documents.removeTag", {
			body: { token: user.getJwtToken(), id: doc.id, tagId: tag.id },
		});
		const body = await res.json();

		expect(res.status).toEqual(200);
		expect(body.data.tags.length).toEqual(0);
	});
});
