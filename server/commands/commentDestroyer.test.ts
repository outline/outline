import { Comment, Event } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import commentDestroyer from "./commentDestroyer";

describe("commentDestroyer", () => {
  const ip = "127.0.0.1";

  it("should destroy existing comment", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const comment = await Comment.create({
      teamId: document.teamId,
      documentId: document.id,
      data: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "test",
              },
            ],
          },
        ],
      },
      createdById: user.id,
    });

    await commentDestroyer({
      comment,
      user,
      ip,
    });

    const count = await Comment.count({
      where: {
        id: comment.id,
      },
    });
    expect(count).toEqual(0);

    const event = await Event.findLatest({
      teamId: user.teamId,
    });
    expect(event!.name).toEqual("comments.delete");
    expect(event!.modelId).toEqual(comment.id);
  });
});
