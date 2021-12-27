import { User } from "@server/models";
import presentUser from "./user";

it("presents a user", async () => {
  const user = presentUser(
    User.build({
      id: "123",
      name: "Test User",
      username: "testuser",
    })
  );
  expect(user).toMatchSnapshot();
});

it("presents a user without slack data", async () => {
  const user = presentUser(
    User.build({
      id: "123",
      name: "Test User",
      username: "testuser",
    })
  );
  expect(user).toMatchSnapshot();
});
