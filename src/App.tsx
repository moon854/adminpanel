import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load components for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AdManagement = React.lazy(() => import('./pages/AdManagement'));
const ApprovedAds = React.lazy(() => import('./pages/ApprovedAds'));
const AllAds = React.lazy(() => import('./pages/AllAds'));
const AdPublishers = React.lazy(() => import('./pages/AdPublishers'));
const RentRequests = React.lazy(() => import('./pages/RentRequests'));
const RequestManagement = React.lazy(() => import('./pages/RequestManagement'));
const ChatSystem = React.lazy(() => import('./pages/ChatSystem'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const CategoryManagement = React.lazy(() => import('./pages/CategoryManagement'));
const AdminNotifications = React.lazy(() => import('./pages/AdminNotifications'));
const CreateAdmin = React.lazy(() => import('./pages/CreateAdmin'));

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
            <Route path="/create-admin" element={
              <Suspense fallback={<div>Loading...</div>}>
                <CreateAdmin />
              </Suspense>
            } />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <Dashboard />
                    </Suspense>
                  } />
                  <Route path="all-ads" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <AllAds />
                    </Suspense>
                  } />
                  <Route path="ads" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <AdManagement />
                    </Suspense>
                  } />
                  <Route path="approved-ads" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <ApprovedAds />
                    </Suspense>
                  } />
                  <Route path="ad-publishers" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <AdPublishers />
                    </Suspense>
                  } />
                  <Route path="rent-requests" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <RentRequests />
                    </Suspense>
                  } />
                  <Route path="requests" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <RequestManagement />
                    </Suspense>
                  } />
                  <Route path="chat" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <ChatSystem />
                    </Suspense>
                  } />
                  <Route path="users" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <UserManagement />
                    </Suspense>
                  } />
                  <Route path="categories" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <CategoryManagement />
                    </Suspense>
                  } />
                  <Route path="notifications" element={
                    <Suspense fallback={<div>Loading...</div>}>
                      <AdminNotifications />
                    </Suspense>
                  } />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;