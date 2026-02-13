import React from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: ("ADMIN" | "STAFF")[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const token = localStorage.getItem("token");
  const rawUser = localStorage.getItem("user");

  if (!token || !rawUser) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(rawUser) as { role?: "ADMIN" | "STAFF" };
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
  allowedRoles: ("ADMIN" | "STAFF")[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles }) => {
  return <ProtectedRoute roles={allowedRoles}>{children}</ProtectedRoute>;
};
