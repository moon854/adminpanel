import React, { useState, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  RequestPage as RequestIcon,
  Chat as ChatIcon,
  People as PeopleIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Logout,
  CardMembership as PublishersIcon,
  LocalShipping as RentIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, getDocs, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useEffect } from 'react';
import { getUnreadChatCount } from '../helpers/chatNotifications';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Pending Ads', icon: <AssignmentIcon />, path: '/ads' },
  { text: 'Approved Ads', icon: <AssignmentIcon />, path: '/approved-ads' },
  { text: 'Ad Publishers', icon: <PublishersIcon />, path: '/ad-publishers' },
  { text: 'Rent Requests', icon: <RentIcon />, path: '/rent-requests' },
  { text: 'Request Management', icon: <RequestIcon />, path: '/requests' },
  { text: 'Chat System', icon: <ChatIcon />, path: '/chat' },
  { text: 'User Management', icon: <PeopleIcon />, path: '/users' },
  { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
];

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const { adminUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch unread notification count with optimization
  const fetchUnreadCount = useCallback(async () => {
    try {
      const notificationsRef = collection(db, 'adminNotifications');
      const q = query(notificationsRef, where('status', '==', 'unread'));
      const querySnapshot = await getDocs(q);
      setUnreadCount(querySnapshot.size);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Fetch unread chat count
  const fetchUnreadChatCount = useCallback(async () => {
    try {
      const count = await getUnreadChatCount();
      setUnreadChatCount(count);
    } catch (error) {
      console.error('Error fetching unread chat count:', error);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    fetchUnreadChatCount();
    
    // Set up real-time listener for chat notifications
    const chatNotificationsQuery = query(
      collection(db, 'adminNotifications'),
      where('type', '==', 'new_message'),
      where('status', '==', 'unread')
    );
    
    const unsubscribeChatNotifications = onSnapshot(chatNotificationsQuery, (snapshot) => {
      setUnreadChatCount(snapshot.size);
    });
    
    // Refresh every 60 seconds instead of 30 for better performance
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchUnreadChatCount();
    }, 60000);
    
    return () => {
      clearInterval(interval);
      unsubscribeChatNotifications();
    };
  }, [fetchUnreadCount, fetchUnreadChatCount]);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const handleProfileMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleProfileMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleProfileMenuClose();
  }, [logout, navigate, handleProfileMenuClose]);

  const drawer = useMemo(() => (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ color: '#47D6FF', fontWeight: 'bold' }}>
          Rent-To-Build Admin
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: '#47D6FF20',
                  '& .MuiListItemIcon-root': {
                    color: '#47D6FF',
                  },
                  '& .MuiListItemText-primary': {
                    color: '#47D6FF',
                    fontWeight: 'bold',
                  },
                },
              }}
            >
              <ListItemIcon>
                {item.text === 'Notifications' ? (
                  <Badge badgeContent={unreadCount} color="error">
                    {item.icon}
                  </Badge>
                ) : item.text === 'Chat System' ? (
                  <Badge badgeContent={unreadChatCount} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  ), [location.pathname, navigate, unreadCount, unreadChatCount]);

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: '#47D6FF',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Admin Panel
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              Welcome, {adminUser?.firstName} {adminUser?.lastName}
            </Typography>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleProfileMenuClose}
            >
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;

