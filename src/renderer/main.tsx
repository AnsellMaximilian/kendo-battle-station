import { createRoot } from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    id: "root",
    path: "/",
    element: <MainLayout />,
    loader: loader,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <App />,
      },
    ],
  },
]);

const root = createRoot(document.getElementById("root"));
root.render(<RouterProvider router={router} />);
