import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ProtectedRoute, RequireRole, RoleRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Staff from "@/pages/Staff";
import Assignments from "@/pages/Assignments";
import Issues from "@/pages/Issues";
import Assets from "@/pages/Assets";
import AssetDetail from "@/pages/AssetDetail";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import SettingsUsers from "@/pages/SettingsUsers";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import StaffProfile from "@/pages/StaffProfile";
import ChangePassword from "@/pages/ChangePassword";
import AdminDashboard from "@/pages/dashboard/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <SonnerToaster />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={
                    <RoleRoute allowedRoles={["ADMIN"]}>
                      <AdminDashboard />
                    </RoleRoute>
                  }
                />

                {/* Admin-only routes */}
                <Route
                  path="/staff"
                  element={
                    <RoleRoute allowedRoles={["ADMIN"]}>
                      <Staff />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/staff/:id"
                  element={
                    <RoleRoute allowedRoles={["ADMIN"]}>
                      <StaffProfile />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/users/:id"
                  element={
                    <RoleRoute allowedRoles={["ADMIN"]}>
                      <Profile />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/assignments"
                  element={
                    <RoleRoute allowedRoles={["ADMIN"]}>
                      <Assignments />
                    </RoleRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <RequireRole allowedRoles={["ADMIN"]}>
                      <Reports />
                    </RequireRole>
                  }
                />
                <Route
                  path="/assets"
                  element={
                    <RequireRole allowedRoles={["ADMIN"]}>
                      <Assets />
                    </RequireRole>
                  }
                />
                <Route
                  path="/assets/:id"
                  element={
                    <RequireRole allowedRoles={["ADMIN"]}>
                      <AssetDetail />
                    </RequireRole>
                  }
                />

                {/* All authenticated users can access */}
                <Route
                  path="/issues"
                  element={
                    <RequireRole allowedRoles={["ADMIN"]}>
                      <Issues />
                    </RequireRole>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <RequireRole allowedRoles={["ADMIN"]}>
                      <Profile />
                    </RequireRole>
                  }
                />
                <Route
                  path="/change-password"
                  element={
                    <RequireRole allowedRoles={["ADMIN"]}>
                      <ChangePassword />
                    </RequireRole>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RequireRole allowedRoles={["ADMIN"]}>
                      <Settings />
                    </RequireRole>
                  }
                />
                <Route
                  path="/settings/users"
                  element={
                    <RoleRoute allowedRoles={["ADMIN"]}>
                      <SettingsUsers />
                    </RoleRoute>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
