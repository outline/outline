import { addMonths, subDays } from "date-fns";
import { renderToStaticMarkup } from "react-dom/server";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";
import { TeamSwitcher } from "./TeamSwitcher";

vi.mock("../Login", () => ({ default: () => null }));

describe("TeamSwitcher", () => {
  it("labels expired workspaces as logged out and preserves the authorization path on their links", () => {
    window.history.replaceState(
      null,
      "",
      "/oauth/authorize?client_id=example&state=original"
    );
    const path = window.location.pathname + window.location.search;
    const element = document.createElement("div");
    element.innerHTML = renderToStaticMarkup(
      <ThemeProvider theme={light}>
        <TeamSwitcher
          sessions={{
            active: {
              name: "Active workspace",
              logoUrl: null,
              url: "https://active.outline.dev",
              expiresAt: addMonths(new Date(), 1).toISOString(),
            },
            expired: {
              name: "Previous workspace",
              logoUrl: null,
              url: "https://previous.outline.dev",
              expiresAt: subDays(new Date(), 1).toISOString(),
            },
          }}
        />
      </ThemeProvider>
    );
    const active = element.querySelector(
      `a[href="https://active.outline.dev${path}"]`
    );
    const expired = element.querySelector(
      `a[href="https://previous.outline.dev${path}"]`
    );
    expect(active?.textContent).toContain("Active workspace");
    expect(active?.textContent).not.toContain("Logged out");
    expect(expired?.textContent).toContain("Previous workspace");
    expect(expired?.textContent).toContain("Logged out");
    window.history.replaceState(null, "", "/");
  });
});
