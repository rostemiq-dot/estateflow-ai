// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TasksPage } from "../pages/TasksPage";
import { ContractsPage } from "../pages/ContractsPage";
import { DocumentsPage } from "../pages/DocumentsPage";
afterEach(() => {
  cleanup();
  window.localStorage.clear();
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
