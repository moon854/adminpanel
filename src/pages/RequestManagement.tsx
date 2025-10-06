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
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardMedia,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { collection, query, getDocs, doc, updateDoc, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';

interface RentalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  adId: string;
  adTitle: string;
  adCategory: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  requestedAt: any;
  startDate: string;
  endDate: string;
  totalAmount: number;
  adminId?: string;
  adminName?: string;
  paymentImage?: string;
  paymentVerified: boolean;
  notes?: string;
}

const RequestManagement: React.FC = () => {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const requestsQuery = query(collection(db, 'rentalRequests'), orderBy('requestedAt', 'desc'));
      const requestsSnapshot = await getDocs(requestsQuery);
      
      const requestsData: RentalRequest[] = [];
      
      for (const requestDoc of requestsSnapshot.docs) {
        const requestData = requestDoc.data();
        
        // Fetch user data
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', requestData.userId)));
        let userName = 'Unknown User';
        let userEmail = 'unknown@email.com';
        
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          userName = `${userData.firstName} ${userData.lastName}`;
          userEmail = userData.email;
        }
        
        // Fetch ad data
        const adDoc = await getDocs(query(collection(db, 'ads'), where('id', '==', requestData.adId)));
        let adTitle = 'Unknown Ad';
        let adCategory = 'Unknown';
        
        if (!adDoc.empty) {
          const adData = adDoc.docs[0].data();
          adTitle = adData.title;
          adCategory = adData.category;
        }
        
        requestsData.push({
          id: requestDoc.id,
          userId: requestData.userId,
          userName,
          userEmail,
          adId: requestData.adId,
          adTitle,
          adCategory,
          status: requestData.status || 'pending',
          requestedAt: requestData.requestedAt,
          startDate: requestData.startDate || '',
          endDate: requestData.endDate || '',
          totalAmount: requestData.totalAmount || 0,
          adminId: requestData.adminId,
          adminName: requestData.adminName,
          paymentImage: requestData.paymentImage,
          paymentVerified: requestData.paymentVerified || false,
          notes: requestData.notes
        });
      }
      
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRequest = async (requestId: string) => {
    try {
      setActionLoading(true);
      await updateDoc(doc(db, 'rentalRequests', requestId), {
        status: 'assigned',
        adminId: 'current-admin-id', // Replace with actual admin ID
        adminName: 'Admin User', // Replace with actual admin name
        assignedAt: new Date()
      });
      
      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'assigned', adminId: 'current-admin-id', adminName: 'Admin User' }
          : req
      ));
      
      setDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error assigning request:', error);
      setError('Failed to assign request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPayment = async (requestId: string) => {
    try {
      setActionLoading(true);
      await updateDoc(doc(db, 'rentalRequests', requestId), {
        paymentVerified: true,
        verifiedAt: new Date()
      });
      
      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, paymentVerified: true }
          : req
      ));
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError('Failed to verify payment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    try {
      setActionLoading(true);
      await updateDoc(doc(db, 'rentalRequests', requestId), {
        status: 'completed',
        completedAt: new Date()
      });
      
      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'completed' }
          : req
      ));
    } catch (error) {
      console.error('Error completing request:', error);
      setError('Failed to complete request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewRequest = (request: RentalRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'in_progress': return 'info';
      case 'assigned': return 'warning';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'adTitle', headerName: 'Ad Title', width: 200, flex: 1 },
    { field: 'userName', headerName: 'Requested By', width: 150 },
    { field: 'adCategory', headerName: 'Category', width: 120 },
    { field: 'startDate', headerName: 'Start Date', width: 120 },
    { field: 'endDate', headerName: 'End Date', width: 120 },
    { field: 'totalAmount', headerName: 'Amount', width: 100, type: 'number' },
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
      ),
    },
    {
      field: 'paymentVerified',
      headerName: 'Payment',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Verified' : 'Pending'}
          color={params.value ? 'success' : 'warning'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 200,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<AssignmentIcon />}
          label="View"
          onClick={() => handleViewRequest(params.row)}
        />,
        ...(params.row.status === 'pending' ? [
          <GridActionsCellItem
            icon={<PersonIcon />}
            label="Assign"
            onClick={() => handleAssignRequest(params.row.id)}
          />
        ] : []),
        ...(params.row.status === 'assigned' && !params.row.paymentVerified ? [
          <GridActionsCellItem
            icon={<MoneyIcon />}
            label="Verify Payment"
            onClick={() => handleVerifyPayment(params.row.id)}
          />
        ] : []),
        ...(params.row.status === 'assigned' && params.row.paymentVerified ? [
          <GridActionsCellItem
            icon={<CalendarIcon />}
            label="Complete"
            onClick={() => handleCompleteRequest(params.row.id)}
          />
        ] : [])
      ],
    },
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#47D6FF' }}>
        Request Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={requests}
          columns={columns}
          pageSizeOptions={[5, 10, 25]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Request Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Request Details - {selectedRequest?.adTitle}
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Request Information
                  </Typography>
                  <Typography><strong>Ad Title:</strong> {selectedRequest.adTitle}</Typography>
                  <Typography><strong>Category:</strong> {selectedRequest.adCategory}</Typography>
                  <Typography><strong>Requested By:</strong> {selectedRequest.userName}</Typography>
                  <Typography><strong>Email:</strong> {selectedRequest.userEmail}</Typography>
                  <Typography><strong>Start Date:</strong> {selectedRequest.startDate}</Typography>
                  <Typography><strong>End Date:</strong> {selectedRequest.endDate}</Typography>
                  <Typography><strong>Total Amount:</strong> PKR {selectedRequest.totalAmount}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Status & Payment
                  </Typography>
                  <Typography><strong>Status:</strong> {selectedRequest.status}</Typography>
                  <Typography><strong>Payment Verified:</strong> {selectedRequest.paymentVerified ? 'Yes' : 'No'}</Typography>
                  {selectedRequest.adminName && (
                    <Typography><strong>Assigned Admin:</strong> {selectedRequest.adminName}</Typography>
                  )}
                  {selectedRequest.paymentImage && (
                    <Box mt={2}>
                      <Typography variant="h6" gutterBottom>
                        Payment Receipt
                      </Typography>
                      <Card>
                        <CardMedia
                          component="img"
                          height="200"
                          image={selectedRequest.paymentImage}
                          alt="Payment receipt"
                        />
                      </Card>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          {selectedRequest?.status === 'pending' && (
            <Button
              onClick={() => handleAssignRequest(selectedRequest.id)}
              variant="contained"
              color="primary"
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={20} /> : 'Assign Request'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequestManagement;

