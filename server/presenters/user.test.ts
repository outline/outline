import { NotificationEventType, UserPreference } from "@shared/types";
import { User } from "@server/models";
import presentUser from "./user";

it("presents a user", async () => {
  const user = presentUser(
    User.build({
      id: "123",
      name: "Test User",
    })
  );
  expect(user).toMatchSnapshot();
});

it("presents a user without slack data", async () => {
  const user = presentUser(
    User.build({
      id: "123",
      name: "Test User",
    })
  );
  expect(user).toMatchSnapshot();
});

it("omits unrecognized preferences and notification settings", async () => {
  const user = User.build({ id: "123", name: "Test User" });
  user.preferences = JSON.parse(
    '{"seamlessEdit":true,"unknownPreference":true}'
  );
  user.notificationSettings = JSON.parse(
    '{"documents.publish":true,"unknown.event":true}'
  );

  const data = presentUser(user, { includeDetails: true });
  expect(data.preferences).toEqual({
    [UserPreference.SeamlessEdit]: true,
  });
  expect(data.notificationSettings).toEqual({
    [NotificationEventType.PublishDocument]: true,
  });
});
