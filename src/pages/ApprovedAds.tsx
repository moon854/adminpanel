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
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../firebase';

interface Ad {
  id: string;
  name: string;
  description: string;
  category: string;
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

const ApprovedAds: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  useEffect(() => {
    fetchApprovedAds();
  }, []);

  const fetchApprovedAds = async () => {
    try {
      setLoading(true);
      console.log('Fetching approved ads...');
      
      const adsRef = collection(db, 'machinery');
      
      // First filter by status only (no index needed)
      const q = query(adsRef, where('status', '==', 'approved'));
      const querySnapshot = await getDocs(q);
      
      console.log(`Found ${querySnapshot.size} approved ads`);
      
      const adsData: Ad[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Processing ad:', data.name || data.vehicleName);
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
          status: 'approved',
          createdAt: data.createdAt,
          userId: data.userId || 'unknown',
          description: data.description || 'No description provided',
          category: data.category || 'Unknown'
        });
      });
      
      console.log('Processed ads:', adsData.length);
      
      // Sort on client side
      adsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Descending order
      });
      
      setAds(adsData);
      console.log('Approved ads set:', adsData.length);
    } catch (error) {
      console.error('Error fetching approved ads:', error);
      setError('Failed to fetch approved ads.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAd = async (adId: string) => {
    try {
      setActionLoading(true);
      const ad = ads.find(ad => ad.id === adId);

      await updateDoc(doc(db, 'machinery', adId), {
        status: 'rejected',
        rejectedAt: new Date()
      });

      // Update local state
      setAds(ads.filter(ad => ad.id !== adId));
      setDialogOpen(false);
    } catch (error) {
      console.error('Error rejecting ad:', error);
      setError('Failed to reject ad');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAd = (ad: Ad) => {
    setSelectedAd(ad);
    setEditingPrice(ad.price);
    setIsEditingPrice(false);
    setDialogOpen(true);
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

  const handleDeleteAd = async (adId: string) => {
    if (!window.confirm('Are you sure you want to delete this approved ad? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      
      // Delete ad from machinery collection
      await deleteDoc(doc(db, 'machinery', adId));
      
      // Update local state
      setAds(ads.filter(ad => ad.id !== adId));
      setDialogOpen(false);
      
      console.log('Approved ad deleted successfully');
    } catch (error) {
      console.error('Error deleting approved ad:', error);
      setError('Failed to delete ad');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Ad Name', width: 200 },
    { field: 'categoryName', headerName: 'Category', width: 150 },
    { field: 'price', headerName: 'Price/Day', width: 120, renderCell: (params) => `₹${params.value}` },
    { field: 'ownerName', headerName: 'Owner', width: 150 },
    { field: 'location', headerName: 'Location', width: 150 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip label="Approved" color="success" size="small" />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Approved On',
      width: 150,
      valueFormatter: (params) => params.value ? new Date(params.value).toLocaleDateString() : 'N/A',
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

        actions.push(
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit Price"
            onClick={() => handleViewAd(params.row)}
          />
        );

        actions.push(
          <GridActionsCellItem
            icon={<CloseIcon />}
            label="Reject"
            onClick={() => handleRejectAd(params.row.id)}
            disabled={actionLoading}
          />
        );

        // Delete action
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

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Approved Ads Management
      </Typography>

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
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleEditPrice}
                      disabled={actionLoading}
                    >
                      Edit Price
                    </Button>
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
                  <Typography variant="body2">Location: {selectedAd.location}</Typography>
                  <Typography variant="body2">Address: {selectedAd.address}</Typography>
                </Grid>
              </Grid>

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Description
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {selectedAd.description}
              </Typography>

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Specifications
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}><Typography variant="body2">Condition: {selectedAd.specifications.condition}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">Power: {selectedAd.specifications.power}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">Capacity: {selectedAd.specifications.capacity}</Typography></Grid>
                <Grid item xs={6}><Typography variant="body2">Torque: {selectedAd.specifications.torque}</Typography></Grid>
              </Grid>

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Rental Policies
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                {selectedAd.rentalPolicies.map((policy, index) => (
                  <li key={index}>
                    <Typography variant="body2">{policy}</Typography>
                  </li>
                ))}
              </Box>

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Images
              </Typography>
              <Grid container spacing={1}>
                {selectedAd.imageUrls.map((url, index) => (
                  <Grid item key={index}>
                    <CardMedia
                      component="img"
                      sx={{ width: 100, height: 100, borderRadius: 1 }}
                      image={url}
                      alt={`Ad Image ${index + 1}`}
                    />
                  </Grid>
                ))}
              </Grid>

              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                Posted On: {selectedAd.createdAt ? new Date(selectedAd.createdAt).toLocaleString() : 'N/A'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Status: {selectedAd.status}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovedAds;
