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
  CurrencyRupee as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  LocalShipping as RentIcon
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
  totalRentRequests: number;
  pendingRentRequests: number;
  approvedRentRequests: number;
  rejectedRentRequests: number;
  completedRentalsRevenue?: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalAds: 0,
    pendingAds: 0,
    approvedAds: 0,
    rejectedAds: 0,
    totalUsers: 0,
    totalRevenue: 0,
    totalRentRequests: 0,
    pendingRentRequests: 0,
    approvedRentRequests: 0,
    rejectedRentRequests: 0,
    completedRentalsRevenue: 0
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

      // Fetch rent requests statistics and completed rentals revenue
      const rentRequestsRef = collection(db, 'rentRequests');
      const rentRequestsSnapshot = await getDocs(rentRequestsRef);
      
      let totalRentRequests = 0;
      let pendingRentRequests = 0;
      let approvedRentRequests = 0;
      let rejectedRentRequests = 0;
      let completedRentalsRevenue = 0;
      let approvedAdvanceRevenue = 0;

      const parseAmount = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        const str = String(val).toString().trim();
        if (!str) return 0;
        // remove currency, commas, spaces
        const cleaned = str.replace(/[^0-9.\-]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      const parseDate = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        try {
          const str = dateStr.toString().trim();
          let d: Date | null = null;
          if (str.includes('-')) {
            const parts = str.split('-');
            if (parts.length === 3 && parts[0].length === 4) {
              const year = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1;
              const day = parseInt(parts[2]);
              d = new Date(year, month, day);
            }
          }
          if (!d && str.includes('/')) {
            const parts = str.split('/');
            if (parts.length === 3) {
              // Try DD/MM/YYYY first
              const dd = parseInt(parts[0]);
              const mm = parseInt(parts[1]) - 1;
              const yy = parseInt(parts[2]);
              const tryDMY = new Date(yy, mm, dd);
              if (!isNaN(tryDMY.getTime())) return tryDMY;
              // Fallback MM/DD/YYYY
              const mm2 = parseInt(parts[0]) - 1;
              const dd2 = parseInt(parts[1]);
              const yy2 = parseInt(parts[2]);
              d = new Date(yy2, mm2, dd2);
            }
          }
          return d && !isNaN(d.getTime()) ? d : null;
        } catch { return null; }
      };

      const isRentalCompleted = (req: any): boolean => {
        if (req?.status === 'completed') return true;
        if (req?.status !== 'approved') {
          return false;
        }
        // Check by date if possible
        if (req?.rentalStartDate && req?.numberOfDays) {
          const start = parseDate(req.rentalStartDate);
          if (start) {
            const end = new Date(start);
            end.setDate(end.getDate() + (parseInt(req.numberOfDays?.toString() || '0') - 1));
            const today = new Date();
            today.setHours(0,0,0,0);
            end.setHours(0,0,0,0);
            if (today >= end) return true;
          }
        }
        // Fallback: if payments indicate full paid
        const adv = parseAmount(req?.advancePayment);
        const rem = parseAmount(req?.remainingPayment);
        const grand = parseAmount(req?.grandTotal);
        const totalRent = parseAmount(req?.totalRent);
        const rentPerDay = parseAmount(req?.rentPerDay);
        const days = parseInt((req?.numberOfDays || 0).toString()) || 0;
        const expected = grand > 0 ? grand : totalRent > 0 ? totalRent : rentPerDay > 0 && days > 0 ? rentPerDay * days : 0;
        if (expected > 0 && adv + rem >= expected) return true;
        return false;
      };
      
      rentRequestsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        totalRentRequests++;
        
        switch (data.status) {
          case 'pending':
            pendingRentRequests++;
            break;
          case 'approved':
            approvedRentRequests++;
            break;
          case 'rejected':
            rejectedRentRequests++;
            break;
        }

        // Sum revenue for completed rentals only (exclude security deposit)
        if (isRentalCompleted(data)) {
          const grandTotal = parseAmount(data.grandTotal);
          const totalRent = parseAmount(data.totalRent);
          const rentPerDay = parseAmount(data.rentPerDay);
          const securityDeposit = parseAmount(data.securityDeposit);
          const adv = parseAmount(data.advancePayment);
          const rem = parseAmount(data.remainingPayment);
          const days = parseInt((data.numberOfDays || 0).toString()) || 0;
          let amount = 0;
          if (grandTotal > 0) amount = grandTotal;
          else if (adv + rem > 0) amount = adv + rem;
          else if (totalRent > 0) amount = totalRent;
          else if (rentPerDay > 0 && days > 0) amount = rentPerDay * days;
          const net = Math.max(0, amount - securityDeposit);
          completedRentalsRevenue += net;
        }

        // Sum advances for rented machinery (approved or completed)
        const isRentedForAdvance = data?.status === 'approved' || isRentalCompleted(data);
        if (isRentedForAdvance) {
          const advOnly = parseAmount(data.advancePayment);
          if (advOnly > 0) {
            approvedAdvanceRevenue += advOnly;
          }
        }
      });
      
      setStats({
        totalAds,
        pendingAds,
        approvedAds,
        rejectedAds,
        totalUsers,
        totalRevenue: approvedAdvanceRevenue,
        totalRentRequests,
        pendingRentRequests,
        approvedRentRequests,
        rejectedRentRequests,
        completedRentalsRevenue
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
    icon?: React.ReactNode;
    color: string;
    onClick?: () => void;
  }>(({ title, value, icon, color, onClick }) => {
    const hasIcon = !!icon;
    return (
      <Card 
        sx={{ 
          cursor: onClick ? 'pointer' : 'default',
          // Smaller + tighter when there's no icon (Revenue cards) to avoid empty space
          minHeight: hasIcon ? { xs: 160, md: 180 } : { xs: 120, md: 130 },
          transition: 'all 0.2s ease-in-out',
          '&:hover': onClick ? { 
            boxShadow: 3,
            transform: 'translateY(-2px)',
          } : {}
        }}
        onClick={onClick}
      >
        <CardContent sx={{ height: '100%', py: hasIcon ? 2 : 1.5 }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent={hasIcon ? 'space-between' : 'center'}
            height="100%"
            gap={2}
          >
            <Box
              flex={1}
              minWidth={0}
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems={hasIcon ? 'flex-start' : 'center'}
              textAlign={hasIcon ? 'left' : 'center'}
            >
            <Typography 
              color="textSecondary" 
              gutterBottom 
              variant="subtitle2"
              sx={{ 
                fontSize: { xs: '0.8rem', sm: '0.85rem', md: '0.9rem' },
                lineHeight: 1.25,
                fontWeight: 600,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {title}
            </Typography>
            <Typography 
              component="div"
              sx={{ 
                fontSize: typeof value === 'string' 
                  ? { xs: '1rem', sm: '1.1rem', md: '1.2rem' }
                  : { xs: '1.4rem', sm: '1.6rem', md: '1.8rem' },
                fontWeight: typeof value === 'string' ? 600 : 700,
                whiteSpace: typeof value === 'string' ? 'normal' : 'nowrap',
                wordBreak: typeof value === 'string' ? 'break-word' : 'normal',
                overflow: typeof value === 'string' ? 'visible' : 'hidden',
                textOverflow: typeof value === 'string' ? 'clip' : 'ellipsis'
              }}
            >
              {value}
            </Typography>
          </Box>
          {icon ? (
            <Box color={color} display="flex" alignItems="center">
              {icon}
            </Box>
          ) : null}
        </Box>
      </CardContent>
    </Card>
    );
  });

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
        
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Revenue (Approved Advances)"
            value={`Rs. ${stats.totalRevenue.toLocaleString()} (PKR)`}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Completed Rentals Revenue"
            value={`Rs. ${(stats.completedRentalsRevenue || 0).toLocaleString()} (PKR)`}
            color="success.main"
          />
        </Grid>
      </Grid>

      {/* Rent Requests Statistics */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Rent Requests Statistics
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Rent Requests"
            value={stats.totalRentRequests}
            icon={<RentIcon sx={{ fontSize: 40 }} />}
            color="primary.main"
            onClick={() => navigate('/rent-requests')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Requests"
            value={stats.pendingRentRequests > 0 ? stats.pendingRentRequests : "No Pending"}
            icon={<RentIcon sx={{ fontSize: 40 }} />}
            color={stats.pendingRentRequests > 0 ? "warning.main" : "success.main"}
            onClick={() => navigate('/rent-requests')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Approved Requests"
            value={stats.approvedRentRequests}
            icon={<RentIcon sx={{ fontSize: 40 }} />}
            color="success.main"
            onClick={() => navigate('/rent-requests')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Rejected Requests"
            value={stats.rejectedRentRequests}
            icon={<RentIcon sx={{ fontSize: 40 }} />}
            color="error.main"
            onClick={() => navigate('/rent-requests')}
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