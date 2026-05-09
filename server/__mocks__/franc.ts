import { vi } from "vitest";

export const franc = vi.fn((text: string) => {
  if (!text || text.trim().length === 0) {
    return "und";
  }

  return "eng";
});
