import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardMedia,
  TextField
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { collection, query, getDocs, doc, updateDoc, orderBy, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Ad {
  id: string;
  name: string;
  categoryName: string;
  price: string;
  rentPerDay: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  address: string;
  location: string;
  imageUrls: string[];
  specifications: {
    condition: string;
    power: string;
    capacity: string;
    torque: string;
  };
  rentalPolicies: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  userId: string;
}

const AdManagement: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const adsRef = collection(db, 'machinery');
      const q = query(adsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const adsData: Ad[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Show only pending ads
        if (data.status === 'pending' || !data.status) {
          adsData.push({
            id: doc.id,
            name: data.name || data.vehicleName || 'Unknown Vehicle',
            categoryName: data.categoryName || data.category || 'Unknown Category',
            price: data.price || data.rentPerDay || '0',
            rentPerDay: data.rentPerDay || data.price || '0',
            ownerName: data.ownerName || data.fullName || 'Unknown Owner',
            ownerPhone: data.ownerPhone || data.phone || 'No Phone',
            ownerEmail: data.ownerEmail || data.email || 'No Email',
            address: data.address || 'No Address',
            location: data.location || 'No Location',
            imageUrls: data.imageUrls || [],
            specifications: data.specifications || {
              condition: 'Unknown',
              power: 'Unknown',
              capacity: 'Unknown',
              torque: 'Unknown'
            },
            rentalPolicies: data.rentalPolicies || [],
            status: 'pending',
            createdAt: data.createdAt,
            userId: data.userId || 'unknown'
          });
        }
      });
      
      setAds(adsData);
    } catch (error) {
      console.error('Error fetching ads:', error);
      setError('Failed to fetch ads');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (adId: string) => {
    try {
      setActionLoading(true);
      const ad = ads.find(ad => ad.id === adId);
      
      await updateDoc(doc(db, 'machinery', adId), {
        status: 'approved',
        approvedAt: new Date()
      });
      
      // Notify user that their ad is approved
      if (ad && ad.userId) {
        await addDoc(collection(db, 'userNotifications'), {
          type: 'ad_approved',
          title: 'Ad Successfully Posted! 🎉',
          message: `Your ad "${ad.name}" has been approved and is now live! Rent: ₹${ad.price}/day`,
          userId: ad.userId,
          adId: adId,
          adData: {
            name: ad.name,
            price: ad.price,
            category: ad.categoryName
          },
          status: 'unread',
          createdAt: serverTimestamp(),
          priority: 'high'
        });
      }
      
      // Update local state
      setAds(ads.map(ad => 
        ad.id === adId ? { ...ad, status: 'approved' } : ad
      ));
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Error approving ad:', error);
      setError('Failed to approve ad');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (adId: string) => {
    try {
      setActionLoading(true);
      const ad = ads.find(ad => ad.id === adId);
      
      await updateDoc(doc(db, 'machinery', adId), {
        status: 'rejected',
        rejectedAt: new Date()
      });
      
      // Notify user that their ad is rejected
      if (ad && ad.userId) {
        await addDoc(collection(db, 'userNotifications'), {
          type: 'ad_rejected',
          title: 'Ad Rejected',
          message: `Your ad "${ad.name}" was rejected. Please contact support for details.`,
          userId: ad.userId,
          adId: adId,
          adData: {
            name: ad.name,
            price: ad.price,
            category: ad.categoryName
          },
          reason: 'Please contact support for details',
          status: 'unread',
          createdAt: serverTimestamp(),
          priority: 'medium'
        });
      }
      
      // Update local state
      setAds(ads.map(ad => 
        ad.id === adId ? { ...ad, status: 'rejected' } : ad
      ));
      
      setDialogOpen(false);
    } catch (error) {
      console.error('Error rejecting ad:', error);
      setError('Failed to reject ad');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditPrice = () => {
    setIsEditingPrice(true);
  };

  const handleSavePrice = async () => {
    if (!selectedAd || !editingPrice) return;
    
    try {
      setActionLoading(true);
      await updateDoc(doc(db, 'machinery', selectedAd.id), {
        price: editingPrice,
        adminPrice: editingPrice,
        priceUpdatedAt: new Date(),
        priceUpdatedBy: 'admin'
      });
      
      // Update local state
      setAds(ads.map(ad => 
        ad.id === selectedAd.id ? { ...ad, price: editingPrice } : ad
      ));
      
      setSelectedAd({ ...selectedAd, price: editingPrice });
      setIsEditingPrice(false);
    } catch (error) {
      console.error('Error updating price:', error);
      setError('Failed to update price');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEditPrice = () => {
    setEditingPrice(selectedAd?.price || '');
    setIsEditingPrice(false);
  };

  const handleViewAd = (ad: Ad) => {
    setSelectedAd(ad);
    setEditingPrice(ad.price);
    setIsEditingPrice(false);
    setDialogOpen(true);
  };

  const handleDeleteAd = async (adId: string) => {
    if (!window.confirm('Are you sure you want to delete this pending ad? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      
      // Delete ad from machinery collection
      await deleteDoc(doc(db, 'machinery', adId));
      
      // Update local state
      setAds(ads.filter(ad => ad.id !== adId));
      setDialogOpen(false);
      
      console.log('Pending ad deleted successfully');
    } catch (error) {
      console.error('Error deleting pending ad:', error);
      setError('Failed to delete ad');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Vehicle Name', width: 200 },
    { field: 'categoryName', headerName: 'Category', width: 150 },
    { field: 'ownerName', headerName: 'Owner', width: 150 },
    { field: 'price', headerName: 'Price/Day', width: 120 },
    { field: 'location', headerName: 'Location', width: 150 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={getStatusColor(params.value) as any}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            icon={<ViewIcon />}
            label="View"
            onClick={() => handleViewAd(params.row)}
          />
        ];

        if (params.row.status === 'pending') {
          actions.push(
            <GridActionsCellItem
              icon={<CheckIcon />}
              label="Approve"
              onClick={() => handleApprove(params.row.id)}
              disabled={actionLoading}
            />
          );
          actions.push(
            <GridActionsCellItem
              icon={<CloseIcon />}
              label="Reject"
              onClick={() => handleReject(params.row.id)}
              disabled={actionLoading}
            />
          );
        }

        // Delete action for all pending ads
        actions.push(
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="Delete"
            onClick={() => handleDeleteAd(params.row.id)}
            disabled={actionLoading}
          />
        );

        return actions;
      }
    }
  ];

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
        Pending Ads Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={ads}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Ad Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Ad Details</DialogTitle>
        <DialogContent>
          {selectedAd && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    {selectedAd.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Category: {selectedAd.categoryName}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6" color="primary" gutterBottom>
                      ₹{selectedAd.price}/day
                    </Typography>
                    {selectedAd.status === 'pending' && (
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={handleEditPrice}
                        disabled={actionLoading}
                      >
                        Edit Price
                      </Button>
                    )}
                  </Box>
                  {isEditingPrice && (
                    <Box display="flex" alignItems="center" gap={1} mt={1}>
                      <TextField
                        size="small"
                        label="New Price"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(e.target.value)}
                        type="number"
                        sx={{ width: 120 }}
                      />
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="primary"
                        onClick={handleSavePrice}
                        disabled={actionLoading}
                      >
                        Save
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={handleCancelEditPrice}
                        disabled={actionLoading}
                      >
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Owner Information
                  </Typography>
                  <Typography variant="body2">Name: {selectedAd.ownerName}</Typography>
                  <Typography variant="body2">Phone: {selectedAd.ownerPhone}</Typography>
                  <Typography variant="body2">Email: {selectedAd.ownerEmail}</Typography>
                  <Typography variant="body2">Address: {selectedAd.address}</Typography>
                  <Typography variant="body2">Location: {selectedAd.location}</Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Specifications
                  </Typography>
                  <Typography variant="body2">Condition: {selectedAd.specifications.condition}</Typography>
                  <Typography variant="body2">Power: {selectedAd.specifications.power}</Typography>
                  <Typography variant="body2">Capacity: {selectedAd.specifications.capacity}</Typography>
                  <Typography variant="body2">Torque: {selectedAd.specifications.torque}</Typography>
                </Grid>

                {selectedAd.rentalPolicies.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Rental Policies
                    </Typography>
                    {selectedAd.rentalPolicies.map((policy, index) => (
                      <Typography key={index} variant="body2">
                        • {policy}
                      </Typography>
                    ))}
                  </Grid>
                )}

                {selectedAd.imageUrls.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      Images
                    </Typography>
                    <Grid container spacing={1}>
                      {selectedAd.imageUrls.map((imageUrl, index) => (
                        <Grid item xs={6} md={3} key={index}>
                          <Card>
                            <CardMedia
                              component="img"
                              height="100"
                              image={imageUrl}
                              alt={`Vehicle image ${index + 1}`}
                            />
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          {selectedAd?.status === 'pending' && (
            <>
              <Button 
                onClick={() => handleApprove(selectedAd.id)}
                color="success"
                disabled={actionLoading}
              >
                Approve
              </Button>
              <Button 
                onClick={() => handleReject(selectedAd.id)}
                color="error"
                disabled={actionLoading}
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdManagement;