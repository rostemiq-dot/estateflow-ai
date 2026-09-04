import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./app/providers";
import { router } from "./app/router";
import { applySettingsTheme, loadSettings } from "./features/settings/settings-storage";
import { AppErrorBoundary } from "./components/ui/AppErrorBoundary";
import "./index.css";

applySettingsTheme(loadSettings());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </AppErrorBoundary>
  </StrictMode>,
);
