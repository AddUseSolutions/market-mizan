import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { CompareProvider } from "./context/CompareContext";
import { LanguageProvider } from "./context/LanguageContext";
import { initAnalytics } from "./utils/analytics";
import "./styles/tailwind.css";
import "./styles/main.css";

initAnalytics();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <CompareProvider>
            <App />
          </CompareProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
