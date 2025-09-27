import { useMemo, useState } from "react";
import {
  AppBar,
  AppBarSection,
  AppBarSpacer,
  Drawer,
  DrawerContent,
  DrawerItemProps,
  DrawerSelectEvent,
} from "@progress/kendo-react-layout";
import { Button } from "@progress/kendo-react-buttons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

interface NavigationItem {
  text: string;
  path: string;
  icon: DrawerItemProps["icon"];
}

const navigationItems: NavigationItem[] = [
  { text: "Dashboard", path: "/dashboard", icon: "k-i-dashboard" },
  { text: "Storage", path: "/storage", icon: "k-i-database" },
  { text: "Clipboard Studio", path: "/clipboard", icon: "k-i-copy" },
  { text: "Pomodoro", path: "/pomodoro", icon: "k-i-clock" },
  { text: "Always-On Timer", path: "/timer", icon: "k-i-play" },
  { text: "Settings", path: "/settings", icon: "k-i-cog" },
];

const findActiveItem = (pathname: string) => {
  return (
    navigationItems.find((item) =>
      pathname === "/"
        ? item.path === "/dashboard"
        : pathname.startsWith(item.path)
    ) || navigationItems[0]
  );
};

export const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerExpanded, setDrawerExpanded] = useState(true);

  const selectedItem = useMemo(
    () => findActiveItem(location.pathname),
    [location.pathname]
  );

  const drawerItems: DrawerItemProps[] = useMemo(
    () =>
      navigationItems.map((item) => ({
        text: item.text,
        icon: item.icon,
        selected: item.path === selectedItem.path,
      })),
    [selectedItem.path]
  );

  const handleDrawerSelect = (event: DrawerSelectEvent) => {
    const targetItem = navigationItems[event.itemIndex];
    if (targetItem) {
      navigate(targetItem.path);
    }
  };

  return (
    <div className="app-shell">
      <AppBar positionMode="sticky" className="app-shell__appbar">
        <AppBarSection>
          <Button
            icon={drawerExpanded ? "k-i-menu-open" : "k-i-menu"}
            onClick={() => setDrawerExpanded((value) => !value)}
            title={drawerExpanded ? "Collapse navigation" : "Expand navigation"}
          />
        </AppBarSection>
        <AppBarSection>
          <h1 className="app-shell__title">Battle Station</h1>
        </AppBarSection>
        <AppBarSpacer style={{ flex: 1 }} />
        <AppBarSection>
          <span className="app-shell__active-label">{selectedItem.text}</span>
        </AppBarSection>
      </AppBar>

      <div className="app-shell__main">
        <Drawer
          expanded={drawerExpanded}
          mini={true}
          mode="push"
          items={drawerItems}
          onSelect={handleDrawerSelect}
        >
          <DrawerContent>
            <main className="app-shell__content">
              <Outlet />
            </main>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};
