import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

export default function ProtectedRoute({ children, requiredPermission }) {
  const { permissions, isLoading } = useAuth();

  // While auth is initializing, show a centered spinner to avoid redirect loops on refresh
  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
        {/* <CircularProgress /> */}
      </Box>
    );
  }

  // if no permission, redirect to login
  if (!permissions || !permissions.includes(requiredPermission)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
