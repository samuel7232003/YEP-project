import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Layout from "../components/Layout/Layout";
import HomePage from "../pages/HomePage/HomePage";
import AdminPage from "../pages/AdminPage/AdminPage";
import NotFound from "../pages/NotFound/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
  {
    path: "/admin",
    element: <AdminPage />,
  },
]);

