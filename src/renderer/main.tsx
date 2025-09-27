import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Navigate,
  RouterProvider,
  createHashRouter,
} from "react-router-dom";

import "../index.css";

import { MainLayout } from "./components/MainLayout";
import { ClipboardPage } from "./pages/ClipboardPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ErrorPage } from "./pages/ErrorPage";
import { PomodoroPage } from "./pages/PomodoroPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StoragePage } from "./pages/StoragePage";
import { TimerPage } from "./pages/TimerPage";

const router = createHashRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "storage", element: <StoragePage /> },
      { path: "clipboard", element: <ClipboardPage /> },
      { path: "pomodoro", element: <PomodoroPage /> },
      { path: "timer", element: <TimerPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

const container = document.getElementById("root");
if (!container) {
  throw new Error("Failed to find the root element");
}

const root = createRoot(container);
root.render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
