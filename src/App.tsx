import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AutomationPage } from "./pages/AutomationPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ContractsPage } from "./pages/ContractsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DealsPage } from "./pages/DealsPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { HelpPage } from "./pages/HelpPage";
import { LoginPage } from "./pages/LoginPage";
import { PropertiesPage } from "./pages/PropertiesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SmartMatchesPage } from "./pages/SmartMatchesPage";
import { TasksPage } from "./pages/TasksPage";
import { TeamPage } from "./pages/TeamPage";
import { ViewingsPage } from "./pages/ViewingsPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<DashboardPage />} />
          <Route path="/properties" element={<PropertiesPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/smart-matches" element={<SmartMatchesPage />} />
          <Route path="/viewings" element={<ViewingsPage />} />
          <Route path="/deals" element={<DealsPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/automation" element={<AutomationPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;