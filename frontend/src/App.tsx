import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { cleanUrlParams } from "./utils/urlCleaner";
import "./App.css";

const App = () => {
  useEffect(() => {
    // Clean tracking parameters from URL when app loads
    cleanUrlParams();
  }, []);

  return <RouterProvider router={router} />;
};

export default App;

