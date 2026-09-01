// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { DashboardShell } from "../components/dashboard/DashboardShell";
import { loadSettings } from "../features/settings/settings-storage";
import { TeamPage } from "../pages/TeamPage";
import { ReportsPage } from "../pages/ReportsPage";
import { AutomationPage } from "../pages/AutomationPage";
import { SettingsPage } from "../pages/SettingsPage";
import { HelpPage } from "../pages/HelpPage";
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.body.style.overflow = "";
});
describe("global workspaces and navigation", () => {
  it("locks mobile drawer scrolling and closes with Escape", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DashboardShell>
          <p>Content</p>
        </DashboardShell>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).toBe("");
  });
  it("persists desktop sidebar collapse preference", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <DashboardShell>
          <p>Content</p>
        </DashboardShell>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(loadSettings().sidebarCollapsed).toBe(true);
  });
  it.each([
    [TeamPage, "Team"],
    [ReportsPage, "Reports"],
    [AutomationPage, "Automation Center"],
    [SettingsPage, "Settings"],
    [HelpPage, "Help Center"],
  ])("renders critical workspace %s", (Page, title) => {
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: title })).toBeTruthy();
  });
});
