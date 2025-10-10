import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Divider
} from '@mui/material';
import {
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CreditCard as CnicIcon,
  CheckCircle as VerifiedIcon,
  Block as BlockedIcon
} from '@mui/icons-material';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';

interface AdPublisher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  cnic: string;
  profilePicture?: string;
  isVerified: boolean;
  isBlocked: boolean;
  adsCount: number;
}

const AdPublishers: React.FC = () => {
  const [publishers, setPublishers] = useState<AdPublisher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdPublishers();
  }, []);

  const fetchAdPublishers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Starting to fetch ad publishers...');

      // Get all ads from machinery collection
      const machineryRef = collection(db, 'machinery');
      const machinerySnapshot = await getDocs(machineryRef);

      console.log('📝 Total ads found:', machinerySnapshot.size);

      // Get unique user IDs who have posted ads
      const userIds = new Set<string>();
      const userAdsCount: { [key: string]: number } = {};

      machinerySnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId || data.ownerId;
        
        console.log('Ad:', doc.id, '| UserId:', userId, '| Name:', data.name);
        
        if (userId) {
          userIds.add(userId);
          userAdsCount[userId] = (userAdsCount[userId] || 0) + 1;
        }
      });

      console.log('👥 Unique user IDs:', Array.from(userIds));
      console.log('📈 Ads count per user:', userAdsCount);

      // Fetch all users once for better performance
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      console.log('💾 Total users in database:', usersSnapshot.size);

      // Create a map of users by ID
      const usersMap: { [key: string]: any } = {};
      usersSnapshot.docs.forEach((doc) => {
        usersMap[doc.id] = { id: doc.id, ...doc.data() };
        console.log('👤 User in DB:', doc.id, '-', doc.data().firstName, doc.data().lastName);
      });

      // Match users with their ads
      const publishersData: AdPublisher[] = [];

      for (const userId of Array.from(userIds)) {
        console.log('🔍 Looking for user:', userId);
        
        const userData = usersMap[userId];

        if (userData) {
          console.log('✅ Found user:', userData.firstName, userData.lastName);
          publishersData.push({
            id: userId,
            firstName: userData.firstName || 'Unknown',
            lastName: userData.lastName || '',
            email: userData.email || 'No Email',
            phone: userData.phone || 'No Phone',
            address: userData.address || 'No Address',
            cnic: userData.cnic || 'Not Provided',
            profilePicture: userData.profilePicture || userData.imageUrl || '',
            isVerified: userData.isVerified || false,
            isBlocked: userData.isBlocked || false,
            adsCount: userAdsCount[userId] || 0
          });
        } else {
          console.warn('❌ User not found:', userId);
        }
      }

      console.log('✨ Final publishers count:', publishersData.length);
      console.log('✨ Publishers data:', publishersData);

      setPublishers(publishersData);
    } catch (error) {
      console.error('❌ Error fetching ad publishers:', error);
      setError('Failed to fetch ad publishers');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

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
        Ad Publishers
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Users who have posted ads on the platform
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {publishers.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No ad publishers found
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {publishers.map((publisher) => (
            <Grid item xs={12} sm={6} md={4} key={publisher.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  }
                }}
              >
                <CardContent>
                  {/* Profile Section */}
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar
                      src={publisher.profilePicture}
                      alt={`${publisher.firstName} ${publisher.lastName}`}
                      sx={{ 
                        width: 80, 
                        height: 80, 
                        mr: 2,
                        bgcolor: '#47D6FF',
                        fontSize: '2rem'
                      }}
                    >
                      {!publisher.profilePicture && getInitials(publisher.firstName, publisher.lastName)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        {publisher.firstName} {publisher.lastName}
                      </Typography>
                      <Box display="flex" gap={1} mt={1}>
                        {publisher.isVerified && (
                          <Chip 
                            icon={<VerifiedIcon />} 
                            label="Verified" 
                            color="success" 
                            size="small" 
                          />
                        )}
                        {publisher.isBlocked && (
                          <Chip 
                            icon={<BlockedIcon />} 
                            label="Blocked" 
                            color="error" 
                            size="small" 
                          />
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* User Details */}
                  <Box>
                    {/* Phone Number */}
                    <Box display="flex" alignItems="center" mb={1.5}>
                      <PhoneIcon sx={{ color: '#47D6FF', mr: 1, fontSize: 20 }} />
                      <Typography variant="body2" color="textSecondary">
                        Phone:
                      </Typography>
                      <Typography variant="body2" ml={1} fontWeight="500">
                        {publisher.phone}
                      </Typography>
                    </Box>

                    {/* CNIC */}
                    <Box display="flex" alignItems="center" mb={1.5}>
                      <CnicIcon sx={{ color: '#47D6FF', mr: 1, fontSize: 20 }} />
                      <Typography variant="body2" color="textSecondary">
                        CNIC:
                      </Typography>
                      <Typography variant="body2" ml={1} fontWeight="500">
                        {publisher.cnic}
                      </Typography>
                    </Box>

                    {/* Address */}
                    <Box display="flex" alignItems="flex-start" mb={1.5}>
                      <LocationIcon sx={{ color: '#47D6FF', mr: 1, mt: 0.3, fontSize: 20 }} />
                      <Box flex={1}>
                        <Typography variant="body2" color="textSecondary">
                          Address:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          fontWeight="500"
                          sx={{ 
                            mt: 0.5,
                            wordBreak: 'break-word'
                          }}
                        >
                          {publisher.address}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Ads Count */}
                    <Box 
                      sx={{ 
                        mt: 2, 
                        pt: 2, 
                        borderTop: '1px solid rgba(0, 0, 0, 0.12)',
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="body2" color="textSecondary">
                        Total Ads Posted
                      </Typography>
                      <Typography variant="h5" sx={{ color: '#47D6FF', fontWeight: 'bold' }}>
                        {publisher.adsCount}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default AdPublishers;

