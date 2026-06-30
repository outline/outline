/* oxlint-disable */
import { vi } from "vitest";

export const client = {
  setUnauthorizedHandler: vi.fn(),
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
