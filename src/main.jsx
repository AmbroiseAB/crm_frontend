import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{ style: { borderRadius: "14px" } }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
