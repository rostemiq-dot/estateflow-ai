export type DashboardNavItem = {
  label: string;
  href: string;
};

export type DashboardNavGroup = {
  label: string;
  items: DashboardNavItem[];
};

export const dashboardNav: DashboardNavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/" },
      { label: "Properties", href: "/properties" },
      { label: "Clients", href: "/clients" },
      { label: "Smart Matches", href: "/matches" },
      { label: "Viewings", href: "/viewings" },
    ],
  },
  {
    label: "Deals",
    items: [{ label: "Deals workspace", href: "/deals" }],
  },
  {
    label: "Management",
    items: [
      { label: "Team", href: "/team" },
      { label: "Documents", href: "/documents" },
      { label: "Reports", href: "/reports" },
      { label: "Automation", href: "/automation" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Notifications", href: "/notifications" },
      { label: "Settings", href: "/settings" },
      { label: "Help", href: "/help" },
    ],
  },
];
