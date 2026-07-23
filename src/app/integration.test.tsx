// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { clients } from "../features/clients/client-data";
import { loadClients, saveClients } from "../features/clients/client-storage";
import { properties } from "../features/properties/property-data";
import { saveProperties } from "../features/properties/property-storage";
import type { Viewing } from "../features/viewings/viewing-data";
import {
  loadViewings,
  saveViewings,
} from "../features/viewings/viewing-storage";
import { ClientsPage } from "../pages/ClientsPage";
import { PropertiesPage } from "../pages/PropertiesPage";
import { ViewingsPage } from "../pages/ViewingsPage";

describe("integrated client matching and viewing workflow", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("creates a typed client, shows live matches, and schedules a viewing", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/clients?add=true"]}>
        <ClientsPage />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText("Full name *"),
      "Browser Test Client",
    );
    await user.type(
      screen.getByLabelText("Phone number *"),
      "+964 750 555 0199",
    );
    await user.type(
      screen.getByLabelText("Email address"),
      "browser.test@example.com",
    );
    await user.type(screen.getByLabelText("Minimum budget *"), "150000");
    await user.type(screen.getByLabelText("Maximum budget *"), "400000");
    await user.clear(screen.getByLabelText("Minimum bedrooms"));
    await user.type(screen.getByLabelText("Minimum bedrooms"), "3");
    await user.click(screen.getByRole("button", { name: "Villa" }));
    await user.type(
      screen.getByLabelText(/Preferred areas/),
      "Italian Village",
    );
    await user.click(screen.getByRole("button", { name: "Create client" }));

    expect(
      screen.getAllByRole("heading", { name: "Browser Test Client" }).length,
    ).toBeGreaterThan(0);
    expect(
      loadClients().some((client) => client.name === "Browser Test Client"),
    ).toBe(true);

    await user.click(
      screen.getByRole("button", { name: "View smart matches" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Best properties for Browser Test Client",
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("Modern family villa").length).toBeGreaterThan(
      0,
    );

    await user.click(
      screen.getAllByRole("button", { name: "Schedule viewing" })[0],
    );
    await user.type(screen.getByLabelText("Date *"), "2026-07-25");
    await user.type(screen.getByLabelText("Time *"), "10:30");
    await user.click(screen.getByRole("button", { name: "Save viewing" }));

    expect(screen.getByText(/Sat, Jul 25, 2026 at 10:30 AM/)).toBeTruthy();
    expect(loadViewings(properties)).toHaveLength(1);
  });

  it("records an outcome and shows it on the related property timeline", async () => {
    const user = userEvent.setup();
    const viewing: Viewing = {
      id: "VIEW-TEST",
      clientId: clients[0].id,
      propertyId: properties[0].id,
      date: "2099-07-25",
      time: "10:30",
      location: "Italian Village main gate",
      status: "Scheduled",
      createdAt: "2026-07-23T10:00:00.000Z",
      updatedAt: "2026-07-23T10:00:00.000Z",
    };

    saveClients(clients);
    saveProperties(properties);
    saveViewings([viewing]);

    const calendar = render(
      <MemoryRouter initialEntries={["/viewings"]}>
        <ViewingsPage />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText("Calendar view"), "All");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getAllByText("Confirmed").length).toBeGreaterThan(0);

    await user.click(
      screen.getByRole("button", { name: "Complete & outcome" }),
    );
    await user.type(
      screen.getByLabelText("Outcome notes"),
      "Client liked the garden and wants to discuss an offer.",
    );
    await user.click(screen.getByRole("button", { name: "Save outcome" }));

    expect(screen.getByText("Interested")).toBeTruthy();
    expect(loadViewings(properties)[0]).toMatchObject({
      status: "Completed",
      outcome: "Interested",
    });

    calendar.unmount();

    render(
      <MemoryRouter initialEntries={["/properties"]}>
        <PropertiesPage />
      </MemoryRouter>,
    );

    const propertyCard = screen
      .getAllByRole("article")
      .find((article) => article.textContent?.includes("Modern family villa"));

    expect(propertyCard).toBeTruthy();
    await user.click(
      within(propertyCard as HTMLElement).getByRole("button", { name: "Open" }),
    );
    await user.click(screen.getByRole("button", { name: /Activity/ }));

    expect(screen.getByText("Aso Karim")).toBeTruthy();
    expect(screen.getByText(/viewing outcome: Interested/i)).toBeTruthy();
  });
});
