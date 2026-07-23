import { createBrowserRouter } from "react-router-dom";
import { DashboardPage } from "../pages/DashboardPage";
import { PropertiesPage } from "../pages/PropertiesPage";
import { ClientsPage } from "../pages/ClientsPage";
import { SmartMatchesPage } from "../pages/SmartMatchesPage";
import { ViewingsPage } from "../pages/ViewingsPage";

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
]);
