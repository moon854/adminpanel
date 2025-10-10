import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Visibility as ViewIcon,
  Payment as PaymentIcon,
  LocalShipping as RentIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { collection, query, getDocs, doc, updateDoc, orderBy, serverTimestamp, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface RentRequest {
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
  status: string;
  requestedAt: any;
  approvedAt: any;
}

const RentRequests: React.FC = () => {
  const [requests, setRequests] = useState<RentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RentRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRentRequests();
  }, []);

  const fetchRentRequests = async () => {
    try {
      setLoading(true);
      const requestsRef = collection(db, 'rentRequests');
      const q = query(requestsRef, orderBy('requestedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const requestsData: RentRequest[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        requestsData.push({
          id: doc.id,
          ...data
        } as RentRequest);
      });
      
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching rent requests:', error);
      setError('Failed to fetch rent requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (request: RentRequest) => {
    try {
      setActionLoading(true);

      // Update request status
      await updateDoc(doc(db, 'rentRequests', request.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: 'admin'
      });

      // Send publisher card to renter (user) via chat
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

      // Send renter card to publisher (machinery owner) via chat
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

  const handleViewDetails = (request: RentRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'warning';
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
      renderCell: (params) => `Rs. ${params.value?.toLocaleString() || 0}`
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value?.toUpperCase()} 
          color={getStatusColor(params.value) as any}
          size="small"
        />
      )
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
            onClick={() => handleViewDetails(params.row)}
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
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Rent Requests
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
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 10 },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
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
                  <Typography variant="body1" fontWeight="600">Rs. {selectedRequest.totalRent?.toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Security Deposit:</Typography>
                  <Typography variant="body1" fontWeight="600">Rs. {selectedRequest.securityDeposit?.toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Advance Payment:</Typography>
                  <Typography variant="body1" fontWeight="600" color="primary">Rs. {selectedRequest.advancePayment?.toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">Remaining Payment:</Typography>
                  <Typography variant="body1" fontWeight="600">Rs. {selectedRequest.remainingPayment?.toLocaleString()}</Typography>
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

export default RentRequests;

