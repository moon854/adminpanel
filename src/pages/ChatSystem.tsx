import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  CardMedia,
  Badge
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Person as PersonIcon,
  Construction as ConstructionIcon
} from '@mui/icons-material';
import { collection, query, getDocs, doc, updateDoc, addDoc, orderBy, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyUserAdminReply, markChatNotificationsAsRead, getUnreadGeneralSupportCount, getUnreadMachineryInquiriesCount } from '../helpers/chatNotifications';

interface Chat {
  id: string;
  chatId: string;
  userId: string;
  userName: string;
  userEmail: string;
  machineryDetails?: {
    id: string;
    name: string;
    category: string;
    price: string;
    location: string;
    imageUrl: string;
  };
  lastMessage: string;
  lastMessageTime: any;
  unreadCount: number;
  status: 'active' | 'closed';
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'admin';
  message: string;
  machineryDetails?: {
    id: string;
    name: string;
    category: string;
    price: string;
    location: string;
    imageUrl: string;
  };
  createdAt: any;
  status: 'sent' | 'delivered' | 'read';
}

const ChatSystem: React.FC = () => {
  const [generalChats, setGeneralChats] = useState<Chat[]>([]);
  const [adChats, setAdChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'ad'>('general');
  const [generalSupportCount, setGeneralSupportCount] = useState(0);
  const [machineryInquiriesCount, setMachineryInquiriesCount] = useState(0);

  useEffect(() => {
    fetchChats();
    fetchTabCounts();
    
    // Set up real-time listener for chat notifications
    const chatNotificationsQuery = query(
      collection(db, 'adminNotifications'),
      where('type', '==', 'new_message')
    );
    
    const unsubscribeChatNotifications = onSnapshot(chatNotificationsQuery, (snapshot) => {
      let generalCount = 0;
      let machineryCount = 0;
      const chatUnreadMap = new Map<string, number>();
      const latestUserMessageMap = new Map<string, { message: string; createdAt: any }>();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const isUnread = data.status === 'unread';
        const chatId: string | undefined = data.chatId;
        if (isUnread && chatId) {
          // Per-chat unread map
          chatUnreadMap.set(chatId, (chatUnreadMap.get(chatId) || 0) + 1);
          // Tab counts by chat type
          if (chatId.startsWith('machinery_')) {
            machineryCount++;
          } else if (chatId.startsWith('general_') || chatId.startsWith('admin_initiated_')) {
            generalCount++;
          }
        }
        // Track latest user message per chat for preview (use notification message and time)
        if (chatId) {
          const prev = latestUserMessageMap.get(chatId);
          const prevTime = prev?.createdAt?.toDate?.()?.getTime?.() || 0;
          const currTime = data.createdAt?.toDate?.()?.getTime?.() || 0;
          if (!prev || currTime >= prevTime) {
            latestUserMessageMap.set(chatId, { message: data.message || '', createdAt: data.createdAt });
          }
        }
      });
      
      // Update tab badges
      setGeneralSupportCount(generalCount);
      setMachineryInquiriesCount(machineryCount);
      
      // Update per-chat unread badges and latest user message preview in both lists
      setGeneralChats((prev) => {
        const updated = prev.map((c) => {
          const unread = chatUnreadMap.get(c.chatId) || 0;
          const latest = latestUserMessageMap.get(c.chatId);
          if (latest) {
            // Only replace preview if the notification is newer than what we have
            const existingTime = c.lastMessageTime?.toDate?.()?.getTime?.() || 0;
            const latestTime = latest.createdAt?.toDate?.()?.getTime?.() || 0;
            if (latestTime >= existingTime) {
              return { ...c, unreadCount: unread, lastMessage: latest.message, lastMessageTime: latest.createdAt };
            }
          }
          return { ...c, unreadCount: unread };
        });
        // Re-sort by latest time
        return [...updated].sort((a, b) => {
          const aTime = a.lastMessageTime?.toDate?.() || new Date(0);
          const bTime = b.lastMessageTime?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });
      });
      setAdChats((prev) => {
        const updated = prev.map((c) => {
          const unread = chatUnreadMap.get(c.chatId) || 0;
          const latest = latestUserMessageMap.get(c.chatId);
          if (latest) {
            const existingTime = c.lastMessageTime?.toDate?.()?.getTime?.() || 0;
            const latestTime = latest.createdAt?.toDate?.()?.getTime?.() || 0;
            if (latestTime >= existingTime) {
              return { ...c, unreadCount: unread, lastMessage: latest.message, lastMessageTime: latest.createdAt };
            }
          }
          return { ...c, unreadCount: unread };
        });
        return [...updated].sort((a, b) => {
          const aTime = a.lastMessageTime?.toDate?.() || new Date(0);
          const bTime = b.lastMessageTime?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });
      });
    });
    
    return () => {
      unsubscribeChatNotifications();
    };
  }, []);

  const fetchTabCounts = async () => {
    try {
      const [generalCount, machineryCount] = await Promise.all([
        getUnreadGeneralSupportCount(),
        getUnreadMachineryInquiriesCount()
      ]);
      setGeneralSupportCount(generalCount);
      setMachineryInquiriesCount(machineryCount);
    } catch (error) {
      console.error('Error fetching tab counts:', error);
    }
  };

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      
      // Get ALL messages once
      const messagesQuery = query(
        collection(db, 'chatMessages'), 
        orderBy('createdAt', 'desc')
      );
      const allMessagesSnapshot = await getDocs(messagesQuery);
      
      const generalChatMap = new Map<string, any>();
      const machineryChatMap = new Map<string, any>();
      
      console.log('📥 Fetching chats - Total messages in DB:', allMessagesSnapshot.size);
      
      allMessagesSnapshot.forEach((doc) => {
        const data = doc.data();
        const chatId = data.chatId || '';
        
        // STRICT: General chats MUST start with 'general_' or 'admin_initiated_' AND NOT 'machinery_'
        if ((chatId.startsWith('general_') || chatId.startsWith('admin_initiated_')) && !chatId.startsWith('machinery_')) {
          console.log('📍 Found general chat:', chatId);
          if (!generalChatMap.has(chatId) || 
              (generalChatMap.get(chatId)?.lastMessageTime?.toDate?.() || new Date(0)) < (data.createdAt?.toDate?.() || new Date(0))) {
            // Extract user ID from chatId
            let userId = data.senderId;
            if (chatId.startsWith('general_')) {
              userId = chatId.replace('general_', '');
            } else if (chatId.startsWith('admin_initiated_')) {
              const parts = chatId.split('_');
              if (parts.length >= 3) {
                userId = parts[2];
              }
            }
            
            generalChatMap.set(chatId, {
              chatId: chatId,
              userId: userId,
              userName: userId, // Will be replaced when we fetch actual user data
              lastMessage: data.message,
              lastMessageTime: data.createdAt,
              isAdminInitiated: data.senderId === 'admin' && chatId.includes('admin_initiated_')
            });
          }
        }
        
        // STRICT: Machinery chats MUST start with 'machinery_' and have machineryDetails
        if (chatId.startsWith('machinery_') && data.machineryDetails) {
          console.log('📍 Found machinery chat:', chatId);
          if (!machineryChatMap.has(chatId) || 
              (machineryChatMap.get(chatId)?.lastMessageTime?.toDate?.() || new Date(0)) < (data.createdAt?.toDate?.() || new Date(0))) {
            // Extract user ID from chatId (format: machinery_{machineryId}_{userId})
            let userId = data.senderId;
            if (chatId.startsWith('machinery_')) {
              const parts = chatId.split('_');
              if (parts.length >= 3) {
                userId = parts[parts.length - 1]; // Last part is userId
              }
            }
            
            machineryChatMap.set(chatId, {
              chatId: chatId,
              userId: userId,
              userName: userId, // Will be replaced when we fetch actual user data
              lastMessage: data.message,
              lastMessageTime: data.createdAt,
              machineryDetails: data.machineryDetails
            });
          }
        }
      });
      
      const generalChatsData: Chat[] = [];
      const generalChatArray = Array.from(generalChatMap.keys());
      
      for (let i = 0; i < generalChatArray.length; i++) {
        const chatId = generalChatArray[i];
        const chatData = generalChatMap.get(chatId);
        
        if (!chatData) continue;
        
        // Fetch user data
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', chatData.userId)));
        let userEmail = 'unknown@email.com';
        let displayName = 'User';
        
        console.log('Fetching user for general chatId:', chatId, 'userId:', chatData.userId, 'Found docs:', userDoc.size);
        
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          userEmail = userData.email || userEmail;
          displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'User';
          console.log('Found user:', displayName, 'Email:', userEmail);
        } else {
          console.log('User not found for userId:', chatData.userId);
        }
        
        generalChatsData.push({
          id: chatId,
          chatId: chatId,
          userId: chatData.userId,
          userName: displayName,
          userEmail,
          lastMessage: chatData.lastMessage || 'No messages yet',
          lastMessageTime: chatData.lastMessageTime,
          unreadCount: 0, // Will be updated later
          status: 'active'
        });
      }
      
      const adChatsData: Chat[] = [];
      const machineryChatArray = Array.from(machineryChatMap.keys());
      
      for (let i = 0; i < machineryChatArray.length; i++) {
        const chatId = machineryChatArray[i];
        const chatData = machineryChatMap.get(chatId);
        
        if (!chatData) continue;
        
        // Fetch user data
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', chatData.userId)));
        let userEmail = 'unknown@email.com';
        let displayName = 'User';
        
        console.log('Fetching user for machinery chatId:', chatId, 'userId:', chatData.userId, 'Found docs:', userDoc.size);
        
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          userEmail = userData.email || userEmail;
          displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'User';
          console.log('Found user:', displayName, 'Email:', userEmail);
        } else {
          console.log('User not found for userId:', chatData.userId);
        }
        
        adChatsData.push({
          id: chatId,
          chatId: chatId,
          userId: chatData.userId,
          userName: displayName,
          userEmail,
          machineryDetails: chatData.machineryDetails,
          lastMessage: chatData.lastMessage || 'No messages yet',
          lastMessageTime: chatData.lastMessageTime,
          unreadCount: 0, // Will be updated later
          status: 'active'
        });
      }
      
      // Get unread counts for chats
      const adminNotificationsQuery = query(
        collection(db, 'adminNotifications'),
        where('type', '==', 'new_message'),
        where('status', '==', 'unread')
      );
      const notificationsSnapshot = await getDocs(adminNotificationsQuery);
      
      const chatUnreadMap = new Map<string, number>();
      notificationsSnapshot.forEach((doc) => {
        const data = doc.data();
        const chatId = data.chatId;
        // Only count notifications for chats that match the chat's type
        if ((chatId?.startsWith('machinery_') && data.machineryDetails) ||
            ((chatId?.startsWith('general_') || chatId?.startsWith('admin_initiated_')) && !data.machineryDetails)) {
          chatUnreadMap.set(chatId, (chatUnreadMap.get(chatId) || 0) + 1);
        }
      });
      
      // Add unread counts to chats
      generalChatsData.forEach(chat => {
        chat.unreadCount = chatUnreadMap.get(chat.chatId) || 0;
      });
      
      adChatsData.forEach(chat => {
        chat.unreadCount = chatUnreadMap.get(chat.chatId) || 0;
      });
      
      // Sort by last message time
      generalChatsData.sort((a, b) => {
        const aTime = a.lastMessageTime?.toDate?.() || new Date(0);
        const bTime = b.lastMessageTime?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      adChatsData.sort((a, b) => {
        const aTime = a.lastMessageTime?.toDate?.() || new Date(0);
        const bTime = b.lastMessageTime?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      setGeneralChats(generalChatsData);
      setAdChats(adChatsData);
      
      console.log('✅ Loaded chats successfully:');
      console.log('  - General Support:', generalChatsData.length, 'chats');
      console.log('  - Machinery Inquiries:', adChatsData.length, 'chats');
    } catch (error) {
      console.error('❌ Error fetching chats:', error);
      setError('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      // Mark notifications as read for this chat
      await markChatNotificationsAsRead(chatId);
      
      // Refresh tab counts after marking as read
      fetchTabCounts();
      // Optimistically clear unread badge for this chat in UI
      setGeneralChats((prev) => prev.map((c) => (c.chatId === chatId ? { ...c, unreadCount: 0 } : c)));
      setAdChats((prev) => prev.map((c) => (c.chatId === chatId ? { ...c, unreadCount: 0 } : c)));
      
      // Simplified query to avoid index requirement
      const messagesQuery = query(
        collection(db, 'chatMessages'), 
        where('chatId', '==', chatId)
      );
      
      console.log('👂 Listening for messages with chatId:', chatId);
      
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesData: Message[] = [];
        
        console.log('📨 Received snapshot with', snapshot.size, 'messages');
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Only get messages that match the exact chatId
          if (data.chatId === chatId) {
            console.log('✅ Matched message:', {
              id: doc.id,
              chatId: data.chatId,
              senderType: data.senderType,
              message: data.message?.substring(0, 30)
            });
            messagesData.push({
              id: doc.id,
              chatId: data.chatId,
              senderId: data.senderId,
              senderName: data.senderName,
              senderType: data.senderType,
              message: data.message,
              machineryDetails: data.machineryDetails,
              createdAt: data.createdAt,
              status: data.status || 'sent'
            });
          }
        });
        
        // Sort messages by creation time (client-side)
        messagesData.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return aTime.getTime() - bTime.getTime();
        });
        
        console.log('📬 Displaying', messagesData.length, 'messages for this chat');
        setMessages(messagesData);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    try {
      // Determine if this is a machinery inquiry or general support based on chatId
      const isMachineryChat = selectedChat.chatId?.startsWith('machinery_');
      
      // STRICT: Only include machineryDetails if this is a machinery chat
      const messageData: any = {
        chatId: selectedChat.chatId,
        senderId: 'admin',
        senderName: 'Admin',
        senderType: 'admin',
        recipientId: selectedChat.userId,
        message: newMessage.trim(),
        createdAt: serverTimestamp(),
        status: 'sent'
      };

      // For machinery chats: include machineryDetails
      if (isMachineryChat && selectedChat.machineryDetails) {
        messageData.machineryDetails = selectedChat.machineryDetails;
      } else {
        // For general chats: explicitly set to null
        messageData.machineryDetails = null;
      }
      
      console.log('📤 Sending message:', {
        chatId: messageData.chatId,
        senderId: messageData.senderId,
        recipientId: messageData.recipientId,
        machineryDetails: messageData.machineryDetails,
        message: messageData.message.substring(0, 50)
      });
      
      await addDoc(collection(db, 'chatMessages'), messageData);
      
      console.log('✅ Message sent successfully');
      
      // Send notification to user
      await notifyUserAdminReply(
        selectedChat.userId,
        newMessage.trim(),
        selectedChat.chatId,
        isMachineryChat && selectedChat.machineryDetails ? selectedChat.machineryDetails : null
      );
      
      console.log('✅ Notification sent to user');
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
        Chat System
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Chat List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '70vh', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>
              Chat Management
            </Typography>
            
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Box sx={{ display: 'flex' }}>
                <Button
                  onClick={() => setActiveTab('general')}
                  sx={{
                    color: activeTab === 'general' ? '#47D6FF' : 'text.secondary',
                    borderBottom: activeTab === 'general' ? 2 : 0,
                    borderColor: '#47D6FF',
                    borderRadius: 0,
                    textTransform: 'none',
                    fontWeight: activeTab === 'general' ? 'bold' : 'normal'
                  }}
                >
                  <Badge badgeContent={generalSupportCount} color="error" sx={{ mr: 1 }}>
                    <span>General Support</span>
                  </Badge>
                </Button>
                <Button
                  onClick={() => setActiveTab('ad')}
                  sx={{
                    color: activeTab === 'ad' ? '#47D6FF' : 'text.secondary',
                    borderBottom: activeTab === 'ad' ? 2 : 0,
                    borderColor: '#47D6FF',
                    borderRadius: 0,
                    textTransform: 'none',
                    fontWeight: activeTab === 'ad' ? 'bold' : 'normal'
                  }}
                >
                  <Badge badgeContent={machineryInquiriesCount} color="error" sx={{ mr: 1 }}>
                    <span>Machinery Inquiries</span>
                  </Badge>
                </Button>
              </Box>
            </Box>
            
            <List>
              {loading ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Loading chats...
                  </Typography>
                </Box>
              ) : (activeTab === 'general' ? generalChats : adChats).length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    No {activeTab === 'general' ? 'general support' : 'machinery'} chats yet
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Users will appear here when they send messages
                  </Typography>
                </Box>
              ) : (
                (activeTab === 'general' ? generalChats : adChats).map((chat) => (
                  <React.Fragment key={chat.id}>
                    <ListItem
                      button
                      onClick={() => setSelectedChat(chat)}
                      selected={selectedChat?.id === chat.id}
                      sx={{
                        '&.Mui-selected': {
                          backgroundColor: '#47D6FF20',
                        },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={chat.userName}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary" noWrap>
                              {chat.machineryDetails ? chat.machineryDetails.name : 'General Inquiry'}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" noWrap>
                              {chat.lastMessage}
                            </Typography>
                          </Box>
                        }
                      />
                      {chat.unreadCount > 0 && (
                        <Chip
                          label={chat.unreadCount}
                          color="primary"
                          size="small"
                        />
                      )}
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        {/* Chat Messages */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {selectedChat.userName}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedChat.machineryDetails ? selectedChat.machineryDetails.name : 'General Inquiry'}
                  </Typography>
                  {selectedChat.machineryDetails && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ConstructionIcon fontSize="small" color="primary" />
                      <Typography variant="caption" color="textSecondary">
                        {selectedChat.machineryDetails.category} • ₹{selectedChat.machineryDetails.price}/day
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Messages */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {messages.length === 0 ? (
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      textAlign: 'center'
                    }}>
                      <Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
                        No messages yet
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Start the conversation by sending a message
                      </Typography>
                    </Box>
                  ) : (
                    messages.map((message) => (
                    <Box key={message.id} sx={{ mb: 2 }}>
                      {/* Show machinery details for first user message */}
                      {message.senderType === 'user' && message.machineryDetails && messages.indexOf(message) === 0 && (
                        <Card sx={{ mb: 2, backgroundColor: '#f8f9fa' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                              Inquiry about: {message.machineryDetails.name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                              {message.machineryDetails.imageUrl && (
                                <CardMedia
                                  component="img"
                                  sx={{ width: 60, height: 60, borderRadius: 1 }}
                                  image={message.machineryDetails.imageUrl}
                                  alt={message.machineryDetails.name}
                                />
                              )}
                              <Box>
                                <Typography variant="body2">
                                  <strong>Category:</strong> {message.machineryDetails.category}
                                </Typography>
                                <Typography variant="body2">
                                  <strong>Price:</strong> ₹{message.machineryDetails.price}/day
                                </Typography>
                                <Typography variant="body2">
                                  <strong>Location:</strong> {message.machineryDetails.location}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      )}
                      
                      {/* Message */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: message.senderType === 'admin' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <Card
                          sx={{
                            maxWidth: '70%',
                            backgroundColor: message.senderType === 'admin' ? '#47D6FF' : '#f5f5f5',
                            color: message.senderType === 'admin' ? 'white' : 'black'
                          }}
                        >
                          <CardContent sx={{ p: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              {message.senderName}
                            </Typography>
                            <Typography variant="body1">
                              {message.message}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.7 }}>
                              {message.createdAt?.toDate?.()?.toLocaleTimeString() || 'Just now'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Box>
                    </Box>
                  ))
                  )}
                </Box>

                {/* Message Input */}
                <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      multiline
                      maxRows={3}
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      variant="outlined"
                      size="small"
                    />
                    <Button
                      variant="contained"
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      sx={{ backgroundColor: '#47D6FF' }}
                    >
                      <SendIcon />
                    </Button>
                  </Box>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'text.secondary'
                }}
              >
                <Typography variant="h6">
                  Select a chat to start messaging
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChatSystem;

