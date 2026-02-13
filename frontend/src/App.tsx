import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute, RoleRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Laptops from "@/pages/Laptops";
import Staff from "@/pages/Staff";
import Assignments from "@/pages/Assignments";
import Issues from "@/pages/Issues";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import SettingsUsers from "@/pages/SettingsUsers";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import StaffProfile from "@/pages/StaffProfile";
import Profile from "@/pages/Profile";
import DashboardRouter from "@/pages/dashboard/DashboardRouter";
import AdminDashboard from "@/pages/dashboard/AdminDashboard";
import StaffDashboard from "@/pages/dashboard/StaffDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <SonnerToaster />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
                  <ProtectedRoute>
                    <DashboardRouter />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute roles={["ADMIN"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/staff"
                element={
                  <ProtectedRoute roles={["ADMIN", "STAFF"]}>
                    <StaffDashboard />
                  </ProtectedRoute>
                }
              />
              
              {/* Admin-only routes */}
              <Route
                path="/laptops"
                element={
                  <RoleRoute allowedRoles={["ADMIN"]}>
                    <Laptops />
                  </RoleRoute>
                }
              />
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
                path="/assignments"
                element={
                  <RoleRoute allowedRoles={["ADMIN", "STAFF"]}>
                    <Assignments />
                  </RoleRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <RoleRoute allowedRoles={["ADMIN"]}>
                    <Reports />
                  </RoleRoute>
                }
              />
              
              {/* All authenticated users can access */}
              <Route path="/issues" element={<Issues />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
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
  </QueryClientProvider>
);

export default App;
