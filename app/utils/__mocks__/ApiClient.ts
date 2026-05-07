/* oxlint-disable */
import { vi } from "vitest";

export const client = {
  post: vi.fn(() =>
    Promise.resolve({
      data: {
        user: {},
        team: {},
        groups: [],
        groupUsers: [],
      },
    })
  ),
};
