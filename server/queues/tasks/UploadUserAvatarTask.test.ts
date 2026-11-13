import { UserAuthentication } from "@server/models";
import FileStorage from "@server/storage/files";
import { buildUser } from "@server/test/factories";
import UploadUserAvatarTask from "./UploadUserAvatarTask";

const avatarUrl = "https://graph.microsoft.com/v1.0/me/photo/$value";

describe("UploadUserAvatarTask", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch the avatar with the stored access token", async () => {
    const storeFromUrl = vi
      .spyOn(FileStorage, "storeFromUrl")
      .mockResolvedValue({
        url: "https://example.com/avatar.png",
        contentType: "image/png",
        contentLength: 100,
      });
    const user = await buildUser();
    const authentication = await UserAuthentication.findOne({
      where: { userId: user.id },
      rejectOnEmpty: true,
    });
    await authentication.update({ accessToken: "token" });

    await new UploadUserAvatarTask().perform({
      userId: user.id,
      avatarUrl,
      userAuthenticationId: authentication.id,
    });

    expect(storeFromUrl).toHaveBeenCalledWith(
      avatarUrl,
      expect.any(String),
      expect.any(String),
      { headers: { Authorization: "Bearer token" } },
      expect.any(Object)
    );
    await user.reload();
    expect(user.avatarUrl).toContain("attachments.redirect");
  });

  it("should not fetch with the authentication of another user", async () => {
    const storeFromUrl = vi.spyOn(FileStorage, "storeFromUrl");
    const user = await buildUser();
    const other = await buildUser({ teamId: user.teamId });
    const authentication = await UserAuthentication.findOne({
      where: { userId: other.id },
      rejectOnEmpty: true,
    });
    await authentication.update({ accessToken: "token" });

    await new UploadUserAvatarTask().perform({
      userId: user.id,
      avatarUrl,
      userAuthenticationId: authentication.id,
    });

    expect(storeFromUrl).not.toHaveBeenCalled();
  });

  it("should fetch without authorization when no authentication is given", async () => {
    const storeFromUrl = vi
      .spyOn(FileStorage, "storeFromUrl")
      .mockResolvedValue(undefined);
    const user = await buildUser();

    await new UploadUserAvatarTask().perform({
      userId: user.id,
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(storeFromUrl).toHaveBeenCalledWith(
      "https://example.com/avatar.png",
      expect.any(String),
      expect.any(String),
      undefined,
      expect.any(Object)
    );
  });
});
