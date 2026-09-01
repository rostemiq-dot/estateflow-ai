import { createBrowserRouter } from "react-router-dom";
import { AutomationPage } from "../pages/AutomationPage";
import { ClientsPage } from "../pages/ClientsPage";
import { ContractsPage } from "../pages/ContractsPage";
import { DashboardPage } from "../pages/DashboardPage";
import { DealsPage } from "../pages/DealsPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { HelpPage } from "../pages/HelpPage";
import { LoginPage } from "../pages/LoginPage";
import { PropertiesPage } from "../pages/PropertiesPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { SmartMatchesPage } from "../pages/SmartMatchesPage";
import { TasksPage } from "../pages/TasksPage";
import { TeamPage } from "../pages/TeamPage";
import { ViewingsPage } from "../pages/ViewingsPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
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
  { path: "/team", element: <TeamPage /> },
  { path: "/reports", element: <ReportsPage /> },
  { path: "/automation", element: <AutomationPage /> },
  { path: "/settings", element: <SettingsPage /> },
  { path: "/help", element: <HelpPage /> },
]);