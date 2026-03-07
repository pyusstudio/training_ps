import React from "react";
import { AuthProvider, useAuth } from "./state/authStore";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";

function AppInner() {
  const { token } = useAuth();
  return token ? <DashboardPage /> : <LoginPage />;
}

export function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

