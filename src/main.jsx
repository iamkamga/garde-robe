import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import { AuthProvider } from "./auth.jsx";
import { useHashRoute } from "./lib/route.js";
import "./index.css";

// Le dashboard (et sa librairie de graphiques) n'est chargé que par les admins.
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));

function Root() {
  const route = useHashRoute();
  if (route.startsWith("/admin")) {
    return (
      <Suspense fallback={<div className="min-h-screen" />}>
        <AdminDashboard />
      </Suspense>
    );
  }
  if (route.startsWith("/compte")) return <AccountPage />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
