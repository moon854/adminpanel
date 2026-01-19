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
  MenuItem,
  Divider
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  LocalShipping as RentIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { collection, query, getDocs, doc, updateDoc, orderBy, where, onSnapshot, serverTimestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface RentalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAddress: string;
  machineryId: string;
  machineryName: string;
  machineryOwnerId: string;
  machineryOwnerName: string;
  machineryOwnerPhone: string;
  machineryOwnerCNIC: string;
  machineryOwnerAddress: string;
  rentalStartDate: string;
  rentalDuration: string;
  numberOfDays: number;
  deliveryLocation: string;
  projectType: string;
  operatorRequired: string;
  rentPerDay: number;
  totalRent: number;
  securityDeposit: number;
  advancePayment: number;
  remainingPayment: number;
  grandTotal: number;
  paymentProofUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: any;
  approvedAt: any;
  approvedBy?: string;
  adminSeen?: boolean;
}

const RequestManagement: React.FC = () => {
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState('');
  
  // Real-time stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    fetchRequests();
    
    // Set up real-time listener for stats
    const requestsRef = collection(db, 'rentRequests');
    const unsubscribe = onSnapshot(requestsRef, (snapshot) => {
      let total = 0;
      let pending = 0;
      let approved = 0;
      let rejected = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        total++;
        
        switch (data.status) {
          case 'pending': pending++; break;
          case 'approved': approved++; break;
          case 'rejected': rejected++; break;
        }
      });

      setStats({ total, pending, approved, rejected });
    });

    return () => unsubscribe();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const requestsRef = collection(db, 'rentRequests');
      const q = query(requestsRef, orderBy('requestedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const requestsData: RentalRequest[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        requestsData.push({
          id: doc.id,
          ...data
        } as RentalRequest);
      });
      
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching rent requests:', error);
      setError('Failed to fetch rent requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (request: RentalRequest) => {
    try {
      setActionLoading(true);

      // Update request status
      await updateDoc(doc(db, 'rentRequests', request.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: 'admin'
      });

      // Send publisher card to renter
      const chatMessageToRenter = {
        chatId: `rent_approved_renter_${request.id}_${Date.now()}`,
        senderId: 'admin',
        senderName: 'Admin Support',
        senderType: 'admin',
        recipientId: request.userId,
        message: `Here are the machinery owner details. Please contact them to arrange delivery:`,
        createdAt: serverTimestamp(),
        status: 'sent',
        type: 'publisher_card',
        publisherCard: {
          ownerName: request.machineryOwnerName,
          ownerPhone: request.machineryOwnerPhone,
          ownerCNIC: request.machineryOwnerCNIC,
          ownerAddress: request.machineryOwnerAddress,
          machineryName: request.machineryName,
          rentalStartDate: request.rentalStartDate,
          rentalDuration: request.rentalDuration,
          deliveryLocation: request.deliveryLocation
        }
      };

      await addDoc(collection(db, 'chatMessages'), chatMessageToRenter);

      // Send renter card to publisher
      const chatMessageToPublisher = {
        chatId: `rent_approved_publisher_${request.id}_${Date.now()}`,
        senderId: 'admin',
        senderName: 'Admin Support',
        senderType: 'admin',
        recipientId: request.machineryOwnerId,
        message: `Here are the renter details. Please contact them to coordinate delivery:`,
        createdAt: serverTimestamp(),
        status: 'sent',
        type: 'renter_card',
        renterCard: {
          renterName: request.userName,
          renterPhone: request.userPhone,
          renterAddress: request.userAddress,
          machineryName: request.machineryName,
          rentalStartDate: request.rentalStartDate,
          rentalDuration: request.rentalDuration,
          deliveryLocation: request.deliveryLocation,
          projectType: request.projectType,
          operatorRequired: request.operatorRequired
        }
      };

      await addDoc(collection(db, 'chatMessages'), chatMessageToPublisher);

      // Create notification for user (renter)
      await addDoc(collection(db, 'notifications'), {
        userId: request.userId,
        type: 'rent_approved',
        title: 'Rent Request Approved',
        message: `Your rent request for "${request.machineryName}" has been approved! Check chat for owner details.`,
        requestId: request.id,
        status: 'unread',
        createdAt: serverTimestamp()
      });

      // Create notification for publisher (machinery owner)
      await addDoc(collection(db, 'notifications'), {
        userId: request.machineryOwnerId,
        type: 'machinery_rented',
        title: 'Your Machinery has been Rented',
        message: `Your "${request.machineryName}" has been rented! Renter will contact you soon. Contact: ${request.userPhone}`,
        requestId: request.id,
        machineryId: request.machineryId,
        machineryName: request.machineryName,
        renterName: request.userName,
        renterPhone: request.userPhone,
        renterAddress: request.userAddress,
        rentalStartDate: request.rentalStartDate,
        rentalDuration: request.rentalDuration,
        deliveryLocation: request.deliveryLocation,
        status: 'unread',
        createdAt: serverTimestamp()
      });

      // Update local state
      setRequests(requests.map(r => 
        r.id === request.id ? { ...r, status: 'approved' } : r
      ));

      setActionLoading(false);
      setDialogOpen(false);
      alert('Request approved! Details sent to both user and machinery owner!');
    } catch (error) {
      console.error('Error approving request:', error);
      setActionLoading(false);
      alert('Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to reject this request?')) {
      return;
    }

    try {
      setActionLoading(true);
      await updateDoc(doc(db, 'rentRequests', requestId), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: 'admin'
      });

      setRequests(requests.map(r => 
        r.id === requestId ? { ...r, status: 'rejected' } : r
      ));
      setActionLoading(false);
    } catch (error) {
      console.error('Error rejecting request:', error);
      setActionLoading(false);
    }
  };

  const handleViewRequest = async (request: RentalRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);

    // Mark request as seen by admin (for sidebar badge count)
    try {
      if (!request.adminSeen) {
        await updateDoc(doc(db, 'rentRequests', request.id), {
          adminSeen: true,
        });

        // Update local state so UI stays in sync
        setRequests(prev =>
          prev.map(r =>
            r.id === request.id ? { ...r, adminSeen: true } : r
          )
        );
      }
    } catch (err) {
      console.error('Error marking request as seen:', err);
    }
  };

  // Utility function to parse dates from various formats
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    
    try {
      const str = dateStr.toString().trim();
      let startDate: Date | null = null;
      
      // Format 1: DD/MM/YYYY or DD-MM-YYYY
      if (str.includes('/') || str.includes('-')) {
        const dateParts = str.split(/[/-]/);
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
          const year = parseInt(dateParts[2]);
          
          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
              day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020) {
            startDate = new Date(year, month, day);
          }
        }
      }
      
      // Format 2: MM/DD/YYYY (American format)
      if (!startDate && str.includes('/')) {
        const dateParts = str.split('/');
        if (dateParts.length === 3) {
          const month = parseInt(dateParts[0]) - 1;
          const day = parseInt(dateParts[1]);
          const year = parseInt(dateParts[2]);
          
          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
              day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020) {
            startDate = new Date(year, month, day);
          }
        }
      }
      
      // Format 3: YYYY-MM-DD
      if (!startDate && str.includes('-')) {
        const dateParts = str.split('-');
        if (dateParts.length === 3 && dateParts[0].length === 4) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1;
          const day = parseInt(dateParts[2]);
          
          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
              day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020) {
            startDate = new Date(year, month, day);
          }
        }
      }
      
      if (startDate && !isNaN(startDate.getTime())) {
        return startDate;
      }
    } catch (error) {
      console.error('Date parse error:', error);
    }
    
    return null;
  };

  // Function to get actual rental status based on dates
  const getActualStatus = (request: RentalRequest): string => {
    const status = request.status;
    
    // If not approved, return the original status
    if (status !== 'approved') {
      return status;
    }
    
    // For approved requests, check if rental period has ended
    if (request.rentalStartDate && request.numberOfDays) {
      const startDate = parseDate(request.rentalStartDate);
      
      if (startDate) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (parseInt(request.numberOfDays.toString()) - 1));
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        // If today >= end date, rental is completed
        const daysDiff = (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (today >= endDate || daysDiff > 0) {
          return 'completed';
        } else {
          return 'active';
        }
      }
    }
    
    // Default to completed if date calculation fails (for old rentals)
    return 'completed';
  };

  const getStatusColor = (request: RentalRequest) => {
    const actualStatus = getActualStatus(request);
    switch (actualStatus) {
      case 'active': return 'success';
      case 'completed': return 'default';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'warning';
    }
  };

  const getStatusLabel = (request: RentalRequest) => {
    const actualStatus = getActualStatus(request);
    switch (actualStatus) {
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'approved': return 'Active';
      case 'rejected': return 'Rejected';
      case 'pending': return 'Pending';
      default: return (request.status?.toString() || 'Unknown').toUpperCase();
    }
  };

  const columns: GridColDef[] = [
    { field: 'userName', headerName: 'Renter Name', width: 150 },
    { field: 'machineryName', headerName: 'Machinery', width: 150 },
    { field: 'machineryOwnerName', headerName: 'Owner', width: 150 },
    { 
      field: 'advancePayment', 
      headerName: 'Advance Payment', 
      width: 150,
      renderCell: (params) => `Rs. ${params.value?.toLocaleString() || 0} (PKR)`
    },
    { 
      field: 'endDate', 
      headerName: 'End Date', 
      width: 120,
      renderCell: (params) => {
        if (params.row.rentalStartDate && params.row.numberOfDays) {
          const startDate = parseDate(params.row.rentalStartDate);
          if (startDate) {
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + (parseInt(params.row.numberOfDays.toString()) - 1));
            return endDate.toLocaleDateString('en-GB');
          }
        }
        return 'N/A';
      }
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => {
        return (
          <Chip 
            label={getStatusLabel(params.row)} 
            color={getStatusColor(params.row) as any}
            size="small"
          />
        );
      }
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 200,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            icon={<ViewIcon />}
            label="View Details"
            onClick={() => handleViewRequest(params.row)}
          />
        ];

        if (params.row.status === 'pending') {
          actions.push(
            <GridActionsCellItem
              icon={<ApproveIcon />}
              label="Approve"
              onClick={() => handleApproveRequest(params.row)}
              disabled={actionLoading}
              showInMenu
            />,
            <GridActionsCellItem
              icon={<RejectIcon />}
              label="Reject"
              onClick={() => handleRejectRequest(params.row.id)}
              disabled={actionLoading}
              showInMenu
            />
          );
        }

        return actions;
      }
    }
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

      {/* Real-time Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#47D6FF10', borderLeft: '4px solid #47D6FF', cursor: 'pointer' }}>
            <CardContent sx={{ py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Total Requests
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ color: '#47D6FF', fontWeight: 'bold' }}>
                    {stats.total}
                  </Typography>
                </Box>
                <RentIcon sx={{ fontSize: 40, color: '#47D6FF' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#FF980010', borderLeft: '4px solid #FF9800', cursor: 'pointer' }}>
            <CardContent sx={{ py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Pending
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ color: '#FF9800', fontWeight: 'bold' }}>
                    {stats.pending}
                  </Typography>
                </Box>
                <AssignmentIcon sx={{ fontSize: 40, color: '#FF9800' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#4CAF5010', borderLeft: '4px solid #4CAF50', cursor: 'pointer' }}>
            <CardContent sx={{ py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Approved
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ color: '#4CAF50', fontWeight: 'bold' }}>
                    {stats.approved}
                  </Typography>
                </Box>
                <ApproveIcon sx={{ fontSize: 40, color: '#4CAF50' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#F4433610', borderLeft: '4px solid #F44336', cursor: 'pointer' }}>
            <CardContent sx={{ py: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="body2" gutterBottom>
                    Rejected
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ color: '#F44336', fontWeight: 'bold' }}>
                    {stats.rejected}
                  </Typography>
                </Box>
                <RejectIcon sx={{ fontSize: 40, color: '#F44336' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
        <DialogTitle>Rent Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box>
              <Grid container spacing={2}>
                {/* Renter Details */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Renter Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Name:</Typography>
                  <Typography variant="body1" fontWeight="600">{selectedRequest.userName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Phone:</Typography>
                  <Typography variant="body1" fontWeight="600">{selectedRequest.userPhone}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Address:</Typography>
                  <Typography variant="body1" fontWeight="600">{selectedRequest.userAddress}</Typography>
                </Grid>

                {/* Machinery Details */}
                <Grid item xs={12} mt={2}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Machinery Information
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Machinery:</Typography>
                  <Typography variant="body1" fontWeight="600">{selectedRequest.machineryName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Owner:</Typography>
                  <Typography variant="body1" fontWeight="600">{selectedRequest.machineryOwnerName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Owner Phone:</Typography>
                  <Typography variant="body1" fontWeight="600">{selectedRequest.machineryOwnerPhone}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Owner CNIC:</Typography>
                  <Typography variant="body1" fontWeight="600">{selectedRequest.machineryOwnerCNIC}</Typography>
                </Grid>

                {/* Rental Details */}
                <Grid item xs={12} mt={2}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Rental Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Start Date:</Typography>
                  <Typography variant="body1" fontWeight="600">{selectedRequest.rentalStartDate}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Duration:</Typography>
                  <Typography variant="body1" fontWeight="600">{selectedRequest.rentalDuration}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">Delivery Location:</Typography>
                  <Typography variant="body1" fontWeight="600">{selectedRequest.deliveryLocation}</Typography>
                </Grid>

                {/* Payment Details */}
                <Grid item xs={12} mt={2}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Payment Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Total Rent:</Typography>
                  <Typography variant="body1" fontWeight="600">Rs. {selectedRequest.totalRent?.toLocaleString()} (PKR)</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Security Deposit:</Typography>
                  <Typography variant="body1" fontWeight="600">Rs. {selectedRequest.securityDeposit?.toLocaleString()} (PKR)</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Advance Payment:</Typography>
                  <Typography variant="body1" fontWeight="600" color="primary">Rs. {selectedRequest.advancePayment?.toLocaleString()} (PKR)</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Remaining Payment:</Typography>
                  <Typography variant="body1" fontWeight="600">Rs. {selectedRequest.remainingPayment?.toLocaleString()} (PKR)</Typography>
                </Grid>

                {/* Payment Proof */}
                {selectedRequest.paymentProofUrl && (
                  <Grid item xs={12} mt={2}>
                    <Typography variant="body2" color="textSecondary" mb={1}>Payment Proof:</Typography>
                    <img 
                      src={selectedRequest.paymentProofUrl} 
                      alt="Payment Proof" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px',
                        borderRadius: '8px',
                        border: '1px solid #ddd'
                      }} 
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedRequest?.status === 'pending' && (
            <>
              <Button 
                onClick={() => handleApproveRequest(selectedRequest)}
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                disabled={actionLoading}
              >
                Approve Request
              </Button>
              <Button 
                onClick={() => {
                  handleRejectRequest(selectedRequest.id);
                  setDialogOpen(false);
                }}
                variant="contained"
                color="error"
                startIcon={<RejectIcon />}
                disabled={actionLoading}
              >
                Reject
              </Button>
            </>
          )}
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequestManagement;

