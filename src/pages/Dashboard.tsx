import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';

interface DashboardStats {
  totalAds: number;
  pendingAds: number;
  approvedAds: number;
  rejectedAds: number;
  totalUsers: number;
  totalRevenue: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalAds: 0,
    pendingAds: 0,
    approvedAds: 0,
    rejectedAds: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch ads statistics with optimized query
      const adsRef = collection(db, 'machinery');
      const adsSnapshot = await getDocs(adsRef);
      
      let totalAds = 0;
      let pendingAds = 0;
      let approvedAds = 0;
      let rejectedAds = 0;
      let totalRevenue = 0;
      
      // Process ads data efficiently
      adsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        totalAds++;
        
        switch (data.status) {
          case 'pending':
            pendingAds++;
            break;
          case 'approved':
            approvedAds++;
            // Calculate revenue (assuming 30% commission)
            const price = parseFloat(data.price || data.rentPerDay || '0');
            if (!isNaN(price)) {
              totalRevenue += price * 0.3;
            }
            break;
          case 'rejected':
            rejectedAds++;
            break;
        }
      });
      
      // Fetch users count with optimized query
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const totalUsers = usersSnapshot.size;
      
      setStats({
        totalAds,
        pendingAds,
        approvedAds,
        rejectedAds,
        totalUsers,
        totalRevenue
      });
      
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError('Failed to fetch dashboard statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const StatCard = React.memo<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
  }>(({ title, value, icon, color, onClick }) => (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        height: '140px',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? { 
          boxShadow: 3,
          transform: 'translateY(-2px)',
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              component="div"
              sx={{ 
                color: typeof value === 'string' && value.includes('No') ? 'text.secondary' : undefined,
                fontSize: typeof value === 'string' && value.includes('No') ? '0.9rem' : undefined,
                fontWeight: typeof value === 'string' && value.includes('No') ? 'normal' : undefined,
                lineHeight: typeof value === 'string' && value.includes('No') ? '1.2' : undefined
              }}
            >
              {value}
            </Typography>
          </Box>
          <Box color={color}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  ));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Ads"
            value={stats.totalAds}
            icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
            color="primary.main"
            onClick={() => navigate('/all-ads')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Ads"
            value={stats.pendingAds > 0 ? stats.pendingAds : "No Pending Ads"}
            icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
            color={stats.pendingAds > 0 ? "warning.main" : "success.main"}
            onClick={() => navigate('/ads')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Approved Ads"
            value={stats.approvedAds}
            icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
            color="success.main"
            onClick={() => navigate('/approved-ads')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<PersonIcon sx={{ fontSize: 40 }} />}
            color="info.main"
            onClick={() => navigate('/users')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Estimated Revenue"
            value={`₹${stats.totalRevenue.toLocaleString()}`}
            icon={<MoneyIcon sx={{ fontSize: 40 }} />}
            color="success.main"
          />
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Dashboard shows real-time statistics from your Rent-To-Build mobile app.
          All data is fetched directly from Firebase Firestore.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Dashboard;