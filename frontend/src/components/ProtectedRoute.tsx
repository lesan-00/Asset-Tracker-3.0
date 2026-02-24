import React from "react";
import { Navigate, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ("ADMIN")[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const rawUser = localStorage.getItem("user");

  if (!token || !rawUser) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(rawUser) as {
      role?: "ADMIN";
      mustChangePassword?: boolean;
    };
    if (user.role !== "ADMIN") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }
    if (user.mustChangePassword && location.pathname !== "/change-password") {
      return <Navigate to="/change-password" replace />;
    }
    if (!user.mustChangePassword && location.pathname === "/change-password") {
      return <Navigate to="/dashboard" replace />;
    }
    if (roles && user.role && !roles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }
    if (roles && !user.role) {
      return <Navigate to="/dashboard" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: ("ADMIN")[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles }) => {
  return <ProtectedRoute roles={allowedRoles}>{children}</ProtectedRoute>;
};

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles: ("ADMIN")[];
}

export const RequireRole: React.FC<RequireRoleProps> = ({ children, allowedRoles }) => {
  return <ProtectedRoute roles={allowedRoles}>{children}</ProtectedRoute>;
};
