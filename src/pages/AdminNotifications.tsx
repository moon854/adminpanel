import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { collection, query, getDocs, doc, updateDoc, orderBy, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  adId?: string;
  adData?: any;
  userId?: string;
  status: 'unread' | 'read';
  createdAt: any;
  priority: 'high' | 'medium' | 'low';
}

const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const notificationsRef = collection(db, 'adminNotifications');
      const q = query(notificationsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const notificationsData: AdminNotification[] = [];
      querySnapshot.forEach((doc) => {
        notificationsData.push({
          id: doc.id,
          ...doc.data()
        } as AdminNotification);
      });

      setNotifications(notificationsData);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'adminNotifications', notificationId), {
        status: 'read'
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => n.status === 'unread');
      const updatePromises = unreadNotifications.map(notification =>
        updateDoc(doc(db, 'adminNotifications', notification.id), {
          status: 'read'
        })
      );

      await Promise.all(updatePromises);
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'read' }))
      );
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'adminNotifications', notificationId));
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setDialogOpen(false);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    setSelectedNotification(notification);
    setDialogOpen(true);
    
    if (notification.status === 'unread') {
      markAsRead(notification.id);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_ad':
        return <NotificationsIcon />;
      case 'ad_approved':
        return <CheckCircleIcon />;
      case 'ad_rejected':
        return <CloseIcon />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Admin Notifications
        </Typography>
        {unreadCount > 0 && (
          <Button
            variant="outlined"
            startIcon={<MarkReadIcon />}
            onClick={markAllAsRead}
          >
            Mark All Read ({unreadCount})
          </Button>
        )}
      </Box>

      {notifications.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No notifications yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You'll receive notifications about new ads and system updates here
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                button
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  backgroundColor: notification.status === 'unread' ? 'action.hover' : 'transparent',
                  borderLeft: notification.status === 'unread' ? 4 : 0,
                  borderLeftColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'action.selected'
                  }
                }}
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={notification.status === 'unread' ? 'bold' : 'normal'}
                      >
                        {notification.title}
                      </Typography>
                      <Chip
                        label={notification.priority}
                        color={getPriorityColor(notification.priority) as any}
                        size="small"
                      />
                      {notification.status === 'unread' && (
                        <Chip label="New" color="primary" size="small" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(notification.createdAt)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {/* Notification Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedNotification?.title}
            </Typography>
            <IconButton
              onClick={() => selectedNotification && deleteNotification(selectedNotification.id)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedNotification && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedNotification.message}
              </Typography>
              
              {selectedNotification.adData && (
                <Box mt={2}>
                  <Typography variant="subtitle1" gutterBottom>
                    Ad Details:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Name: {selectedNotification.adData.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Category: {selectedNotification.adData.category}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Price: ₹{selectedNotification.adData.price}/day
                  </Typography>
                  {selectedNotification.adData.ownerName && (
                    <Typography variant="body2" color="text.secondary">
                      Owner: {selectedNotification.adData.ownerName}
                    </Typography>
                  )}
                </Box>
              )}
              
              <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                  Received: {formatDate(selectedNotification.createdAt)}
                </Typography>
              </Box>
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

export default AdminNotifications;