import { Reaction } from "@server/models";
import {
  buildComment,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#reactions.list", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/reactions.list");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body).toMatchSnapshot();
  });

  it("should return all reactions for a comment", async () => {
    const team = await buildTeam();
    const user = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const comment = await buildComment({
      userId: user.id,
      documentId: document.id,
    });
    await Reaction.bulkCreate([
      { emoji: "😄", commentId: comment.id, userId: user.id },
      { emoji: "😅", commentId: comment.id, userId: user.id },
    ]);

    const res = await server.post("/api/reactions.list", user, {
      body: {
        commentId: comment.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
    expect(body.data[0].commentId).toEqual(comment.id);
    expect(body.data[0].user.id).toEqual(user.id);
    expect(body.data[0].user.name).toEqual(user.name);
    expect(body.pagination.total).toEqual(2);
  });
});
