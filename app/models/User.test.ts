import User from "./User";
import stores from "~/stores";

describe("User model", () => {
  const users = stores.users;

  describe("initial", () => {
    it("should return first character of name uppercased", () => {
      const user = new User(
        {
          id: "123",
          name: "alice smith",
        },
        users
      );
      expect(user.initial).toBe("A");
    });

    it("should return first character when name is already uppercase", () => {
      const user = new User(
        {
          id: "124",
          name: "Bob Johnson",
        },
        users
      );
      expect(user.initial).toBe("B");
    });

    it("should return ? when name is empty", () => {
      const user = new User(
        {
          id: "125",
          name: "",
        },
        users
      );
      expect(user.initial).toBe("?");
    });

    it("should return ? when name is null", () => {
      const user = new User(
        {
          id: "126",
          name: null,
        },
        users
      );
      expect(user.initial).toBe("?");
    });

    it("should return ? when name is undefined", () => {
      const user = new User(
        {
          id: "127",
          name: undefined,
        },
        users
      );
      expect(user.initial).toBe("?");
    });
  });

  describe("initials", () => {
    it("should return empty string when name is empty", () => {
      const user = new User(
        {
          id: "201",
          name: "",
        },
        users
      );
      expect(user.initials).toBe("");
    });

    it("should return empty string when name is null", () => {
      const user = new User(
        {
          id: "202",
          name: null,
        },
        users
      );
      expect(user.initials).toBe("");
    });

    it("should return single character uppercased for single word name", () => {
      const user = new User(
        {
          id: "203",
          name: "alice",
        },
        users
      );
      expect(user.initials).toBe("A");
    });

    it("should return single character uppercased for single word name already uppercase", () => {
      const user = new User(
        {
          id: "204",
          name: "BOB",
        },
        users
      );
      expect(user.initials).toBe("B");
    });

    it("should return first and last initials for two word name", () => {
      const user = new User(
        {
          id: "205",
          name: "alice smith",
        },
        users
      );
      expect(user.initials).toBe("AS");
    });

    it("should return first and last initials for three word name", () => {
      const user = new User(
        {
          id: "206",
          name: "alice marie smith",
        },
        users
      );
      expect(user.initials).toBe("AS");
    });

    it("should return first and last initials for many word name", () => {
      const user = new User(
        {
          id: "207",
          name: "alice marie jane doe smith",
        },
        users
      );
      expect(user.initials).toBe("AS");
    });

    it("should handle names with extra spaces", () => {
      const user = new User(
        {
          id: "208",
          name: "  alice   smith  ",
        },
        users
      );
      expect(user.initials).toBe("AS");
    });

    it("should handle names with mixed case", () => {
      const user = new User(
        {
          id: "209",
          name: "aLiCe sMiTh",
        },
        users
      );
      expect(user.initials).toBe("AS");
    });

    it("should handle names with special characters", () => {
      const user = new User(
        {
          id: "210",
          name: "Jean-Pierre O'Connor",
        },
        users
      );
      expect(user.initials).toBe("JO");
    });

    it("should handle single letter names", () => {
      const user = new User(
        {
          id: "211",
          name: "X",
        },
        users
      );
      expect(user.initials).toBe("X");
    });

    it("should handle names with unicode characters", () => {
      const user = new User(
        {
          id: "212",
          name: "José García",
        },
        users
      );
      expect(user.initials).toBe("JG");
    });
  });
});
