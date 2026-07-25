// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TasksPage } from "../pages/TasksPage";
import { ContractsPage } from "../pages/ContractsPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { clients } from "../features/clients/client-data";
import { properties } from "../features/properties/property-data";
import { createDeal, saveDeals } from "../features/deals/deal-storage";
import { acceptOffer } from "../features/deals/deal-utils";
import { loadContracts } from "../features/contracts/contract-storage";
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});
describe("operations screens", () => {
  it("renders the tasks workspace and notification bell", () => {
    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeTruthy();
    expect(screen.getByLabelText(/Notifications/)).toBeTruthy();
  });
  it("keeps the task modal bounded, scrollable, closable, and restores focus", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );
    const addButton = screen.getByRole("button", { name: /Add task/i });
    await user.click(addButton);
    const dialog = screen.getByRole("dialog", { name: "Create task" });
    expect(dialog.className).toMatch(/max-h/);
    expect(screen.getByTestId("create-task-scroll-region").className).toMatch(
      /overflow-y-auto/,
    );
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: /Close create task/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /Close create task/i }),
    );
    expect(screen.queryByRole("dialog", { name: "Create task" })).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(addButton);
  });
  it("supports Escape, backdrop close, focus trapping, and dirty warnings", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /Add task/i }));
    await user.type(screen.getByPlaceholderText("Task title"), "Unsaved task");
    await user.keyboard("{Escape}");
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Create task" })).toBeTruthy();
    confirm.mockReturnValue(true);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Create task" })).toBeNull();

    await user.click(screen.getByRole("button", { name: /Add task/i }));
    const closeButton = screen.getByRole("button", {
      name: /Close create task/i,
    });
    closeButton.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Create task" }),
    );
    fireEvent.mouseDown(
      screen.getByRole("dialog").parentElement as HTMLElement,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("renders contracts and legal disclaimer", () => {
    render(
      <MemoryRouter>
        <ContractsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Contracts" })).toBeTruthy();
    expect(
      screen.getByText(
        /require review by a qualified local legal professional/i,
      ),
    ).toBeTruthy();
  });
  it("selects an eligible accepted offer and persists its draft contract", async () => {
    const user = userEvent.setup();
    const deal = createDeal(
      {
        title: "Accepted villa deal",
        clientId: clients[0].id,
        propertyId: properties[0].id,
        type: "Sale",
        stage: "Offer Made",
        expectedValueMinor: 32500000,
        currency: "USD",
        probability: 80,
        assignedAgent: "Mohammed",
        nextAction: "",
        nextActionAt: "",
        expectedCloseDate: "",
        notes: "",
      },
      [],
    );
    deal.offers = [
      {
        id: "OFF-ELIGIBLE",
        amountMinor: 32000000,
        date: "2026-07-25",
        expirationDate: "",
        conditions: "",
        notes: "",
        status: "Sent",
        createdAt: "2026-07-25T09:00:00Z",
        updatedAt: "2026-07-25T09:00:00Z",
      },
    ];
    saveDeals([acceptOffer(deal, "OFF-ELIGIBLE", "2026-07-25T10:00:00Z")]);
    render(
      <MemoryRouter>
        <ContractsPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Create contract" }));
    expect(screen.getByText(/Accepted villa deal/)).toBeTruthy();
    expect(screen.getByText(/\$320,000/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create draft" }));
    expect(loadContracts()).toHaveLength(1);
    expect(loadContracts()[0].offerId).toBe("OFF-ELIGIBLE");
    expect(screen.getByText(/ESTATEFLOW SALE CONTRACT/)).toBeTruthy();
  });
  it("renders the empty shared document center", () => {
    render(
      <MemoryRouter>
        <DocumentsPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Document Center" }),
    ).toBeTruthy();
    expect(screen.getByText(/No uploaded documents/i)).toBeTruthy();
  });
});
