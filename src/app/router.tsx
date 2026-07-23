import { createBrowserRouter } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { PropertiesPage } from "../pages/PropertiesPage";
import { ClientsPage } from "../pages/ClientsPage";
import { SmartMatchesPage } from "../pages/SmartMatchesPage";
import { ViewingsPage } from "../pages/ViewingsPage";
import { DealsPage } from "../pages/DealsPage";
import { ContractsPage } from "../pages/ContractsPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { TasksPage } from "../pages/TasksPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardPage />,
  },
  {
    path: "/properties",
    element: <PropertiesPage />,
  },
  {
    path: "/clients",
    element: <ClientsPage />,
  },
  {
    path: "/matches",
    element: <SmartMatchesPage />,
  },
  {
    path: "/viewings",
    element: <ViewingsPage />,
  },
  {
    path: "/deals",
    element: <DealsPage />,
  },
  { path: "/contracts", element: <ContractsPage /> },
  { path: "/documents", element: <DocumentsPage /> },
  { path: "/tasks", element: <TasksPage /> },
]);
