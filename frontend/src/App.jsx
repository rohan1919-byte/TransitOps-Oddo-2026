import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Fleet from './pages/Fleet';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelExpenses from './pages/FuelExpenses';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function ProtectedRoute({ children, resource }) {
  const { user, can } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (resource && !can(resource)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute resource="dashboard"><Dashboard /></ProtectedRoute>} />
      <Route path="/fleet" element={<ProtectedRoute resource="vehicles"><Fleet /></ProtectedRoute>} />
      <Route path="/drivers" element={<ProtectedRoute resource="drivers"><Drivers /></ProtectedRoute>} />
      <Route path="/trips" element={<ProtectedRoute resource="trips"><Trips /></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute resource="maintenance"><Maintenance /></ProtectedRoute>} />
      <Route path="/fuel-expenses" element={<ProtectedRoute resource="fuel"><FuelExpenses /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute resource="analytics"><Analytics /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute resource="settings"><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
