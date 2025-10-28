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
  DialogActions
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { notifyUserAdminReply } from '../helpers/chatNotifications';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  cnic: string;
  company: string;
  role: string;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: any;
  lastLoginAt: any;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          id: doc.id,
          firstName: data.firstName || 'Unknown',
          lastName: data.lastName || '',
          email: data.email || 'No Email',
          phone: data.phone || 'No Phone',
          address: data.address || 'No Address',
          cnic: data.cnic || 'No CNIC',
          company: data.company || 'No Company',
          role: data.role || 'user',
          isVerified: data.isVerified || false,
          isBlocked: data.isBlocked || false,
          createdAt: data.createdAt,
          lastLoginAt: data.lastLoginAt
        });
      });
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      setActionLoading(true);
      await updateDoc(doc(db, 'users', userId), {
        isBlocked: true,
        blockedAt: new Date()
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isBlocked: true } : user
      ));
      
    } catch (error) {
      console.error('Error blocking user:', error);
      setError('Failed to block user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      setActionLoading(true);
      await updateDoc(doc(db, 'users', userId), {
        isBlocked: false,
        unblockedAt: new Date()
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isBlocked: false } : user
      ));
      
    } catch (error) {
      console.error('Error unblocking user:', error);
      setError('Failed to unblock user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyUser = async (userId: string) => {
    try {
      setActionLoading(true);
      await updateDoc(doc(db, 'users', userId), {
        isVerified: true,
        verifiedAt: new Date()
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isVerified: true } : user
      ));
      
    } catch (error) {
      console.error('Error verifying user:', error);
      setError('Failed to verify user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setActionLoading(true);
      
      // Delete user from users collection
      await deleteDoc(doc(db, 'users', userId));
      
      // Also delete user's ads from machinery collection
      const machineryRef = collection(db, 'machinery');
      const userMachineryQuery = query(machineryRef, where('userId', '==', userId));
      const userMachinerySnapshot = await getDocs(userMachineryQuery);
      
      const deletePromises = userMachinerySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Update local state
      setUsers(users.filter(user => user.id !== userId));
      
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleChatWithUser = async (user: User) => {
    try {
      setActionLoading(true);
      
      // Create a unique chat ID for admin-initiated chat
      const chatId = `admin_initiated_${user.id}_${Date.now()}`;
      
      // Create initial admin message
      const initialMessage = {
        chatId: chatId,
        senderId: 'admin',
        senderName: 'Admin',
        senderType: 'admin',
        recipientId: user.id, // Add recipientId for app notifications
        message: `Hello ${user.firstName}! I'm reaching out from the admin team. How can I help you today?`,
        createdAt: serverTimestamp(),
        status: 'sent'
      };

      // Add the message to chatMessages collection
      await addDoc(collection(db, 'chatMessages'), initialMessage);
      
      // Send notification to user
      await notifyUserAdminReply(
        user.id,
        initialMessage.message,
        chatId,
        null // No machinery details for general support
      );
      
      // Navigate to chat system
      navigate('/chat');
      
    } catch (error) {
      console.error('Error initiating chat with user:', error);
      setError('Failed to initiate chat with user');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (isBlocked: boolean, isVerified: boolean) => {
    if (isBlocked) return 'error';
    if (isVerified) return 'success';
    return 'warning';
  };

  const getStatusText = (isBlocked: boolean, isVerified: boolean) => {
    if (isBlocked) return 'Blocked';
    if (isVerified) return 'Verified';
    return 'Pending';
  };

  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', width: 150 },
    { field: 'lastName', headerName: 'Last Name', width: 150 },
    { field: 'email', headerName: 'Email', width: 200 },
    { field: 'phone', headerName: 'Phone', width: 150 },
    { field: 'role', headerName: 'Role', width: 100 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={getStatusText(params.row.isBlocked, params.row.isVerified)} 
          color={getStatusColor(params.row.isBlocked, params.row.isVerified) as any}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 280,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            icon={<PersonIcon />}
            label="View"
            onClick={() => handleViewUser(params.row)}
          />
        ];

        if (params.row.role !== 'admin') {
          // Add Chat with User action
          actions.push(
            <GridActionsCellItem
              icon={<ChatIcon />}
              label="Chat with User"
              onClick={() => handleChatWithUser(params.row)}
              disabled={actionLoading}
            />
          );

          if (params.row.isBlocked) {
            actions.push(
              <GridActionsCellItem
                icon={<CheckCircleIcon />}
                label="Unblock"
                onClick={() => handleUnblockUser(params.row.id)}
                disabled={actionLoading}
              />
            );
          } else {
            actions.push(
              <GridActionsCellItem
                icon={<BlockIcon />}
                label="Block"
                onClick={() => handleBlockUser(params.row.id)}
                disabled={actionLoading}
              />
            );
          }

          if (!params.row.isVerified) {
            actions.push(
              <GridActionsCellItem
                icon={<CheckCircleIcon />}
                label="Verify"
                onClick={() => handleVerifyUser(params.row.id)}
                disabled={actionLoading}
              />
            );
          }

          // Delete user action (for non-admin users)
          actions.push(
            <GridActionsCellItem
              icon={<DeleteIcon />}
              label="Delete"
              onClick={() => handleDeleteUser(params.row.id)}
              disabled={actionLoading}
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
        User Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={users}
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

      {/* User Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedUser.firstName} {selectedUser.lastName}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Role: {selectedUser.role}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Email: {selectedUser.email}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Phone: {selectedUser.phone}
              </Typography>
              <Typography variant="body2" gutterBottom>
                CNIC: {selectedUser.cnic}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Company: {selectedUser.company}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Address: {selectedUser.address}
              </Typography>
              <Typography variant="body2" gutterBottom>
                Status: {getStatusText(selectedUser.isBlocked, selectedUser.isVerified)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedUser && selectedUser.role !== 'admin' && (
            <Button 
              onClick={() => {
                handleChatWithUser(selectedUser);
                setDialogOpen(false);
              }}
              variant="contained"
              startIcon={<ChatIcon />}
              disabled={actionLoading}
              sx={{ backgroundColor: '#47D6FF' }}
            >
              Chat with User
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;