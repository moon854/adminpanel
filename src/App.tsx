import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdManagement from './pages/AdManagement';
import ApprovedAds from './pages/ApprovedAds';
import AllAds from './pages/AllAds';
import RequestManagement from './pages/RequestManagement';
import ChatSystem from './pages/ChatSystem';
import UserManagement from './pages/UserManagement';
import AdminNotifications from './pages/AdminNotifications';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#47D6FF',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="all-ads" element={<AllAds />} />
                  <Route path="ads" element={<AdManagement />} />
                  <Route path="approved-ads" element={<ApprovedAds />} />
                  <Route path="requests" element={<RequestManagement />} />
                  <Route path="chat" element={<ChatSystem />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="notifications" element={<AdminNotifications />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;