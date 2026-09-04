import { createBrowserRouter } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { PropertiesPage } from "../pages/PropertiesPage";
import { DatabaseClientsPage } from "../pages/DatabaseClientsPage";
import { SmartMatchesPage } from "../pages/SmartMatchesPage";
import { DatabaseViewingsPage } from "../pages/DatabaseViewingsPage";
import { DatabaseDealsPage } from "../pages/DatabaseDealsPage";
import { ContractsPage } from "../pages/ContractsPage";
import { DocumentsPage } from "../pages/DocumentsPage";
import { TasksPage } from "../pages/TasksPage";
import { TeamPage } from "../pages/TeamPage";
import { ReportsPage } from "../pages/ReportsPage";
import { AutomationPage } from "../pages/AutomationPage";
import { SettingsPage } from "../pages/SettingsPage";
import { HelpPage } from "../pages/HelpPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/properties", element: <PropertiesPage /> },
      { path: "/clients", element: <DatabaseClientsPage /> },
      { path: "/matches", element: <SmartMatchesPage /> },
      { path: "/viewings", element: <DatabaseViewingsPage /> },
      { path: "/deals", element: <DatabaseDealsPage /> },
      { path: "/contracts", element: <ContractsPage /> },
      { path: "/documents", element: <DocumentsPage /> },
      { path: "/tasks", element: <TasksPage /> },
      { path: "/team", element: <TeamPage /> },
      { path: "/reports", element: <ReportsPage /> },
      { path: "/automation", element: <AutomationPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/help", element: <HelpPage /> },
    ],
  },
]);
