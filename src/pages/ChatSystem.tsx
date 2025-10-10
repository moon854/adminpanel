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
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'unread') {
          if (data.machineryDetails) {
            machineryCount++;
          } else {
            generalCount++;
          }
        }
      });
      
      setGeneralSupportCount(generalCount);
      setMachineryInquiriesCount(machineryCount);
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
      
      // Get general chats (no machinery details) - simplified query
      const generalMessagesQuery = query(
        collection(db, 'chatMessages'), 
        orderBy('createdAt', 'desc')
      );
      const generalSnapshot = await getDocs(generalMessagesQuery);
      
      const generalChatIds = new Set<string>();
      const generalChatDataMap = new Map<string, any>();
      
      generalSnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter for general chats (no machinery details and not machinery-related chatId)
        if (!data.machineryDetails && !generalChatIds.has(data.chatId) && !data.chatId?.includes('machinery_')) {
          generalChatIds.add(data.chatId);
          
          // For admin-initiated chats, we need to extract the user ID from the chatId
          let userId = data.senderId;
          let userName = data.senderName;
          
          if (data.senderId === 'admin' && data.chatId.includes('admin_initiated_')) {
            // Extract user ID from admin-initiated chat ID format: admin_initiated_{userId}_{timestamp}
            const chatIdParts = data.chatId.split('_');
            if (chatIdParts.length >= 3) {
              userId = chatIdParts[2];
              // We'll fetch the user name separately below
            }
          }
          
          generalChatDataMap.set(data.chatId, {
            chatId: data.chatId,
            userId: userId,
            userName: userName,
            lastMessage: data.message,
            lastMessageTime: data.createdAt,
            chatType: 'general',
            isAdminInitiated: data.senderId === 'admin'
          });
        }
      });
      
      const generalChatsData: Chat[] = [];
      
      for (const chatId of Array.from(generalChatIds)) {
        const chatData = generalChatDataMap.get(chatId);
        
        // Fetch user data
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', chatData.userId)));
        let userEmail = 'unknown@email.com';
        let displayName = chatData.userName;
        
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          userEmail = userData.email;
          
          // For admin-initiated chats, use the actual user's name
          if (chatData.isAdminInitiated) {
            displayName = `${userData.firstName} ${userData.lastName}`.trim();
          }
        }
        
        console.log('Adding general chat:', chatId, chatData);
        generalChatsData.push({
          id: chatId,
          chatId: chatId,
          userId: chatData.userId,
          userName: displayName,
          userEmail,
          lastMessage: chatData.lastMessage || 'No messages yet',
          lastMessageTime: chatData.lastMessageTime,
          unreadCount: 0,
          status: 'active'
        });
      }
      
      // Get ad-specific chats (with machinery details) - simplified query
      const adMessagesQuery = query(
        collection(db, 'chatMessages'), 
        orderBy('createdAt', 'desc')
      );
      const adSnapshot = await getDocs(adMessagesQuery);
      
      const adChatIds = new Set<string>();
      const adChatDataMap = new Map<string, any>();
      
      adSnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter for ad-specific chats (with machinery details)
        if (data.machineryDetails && !adChatIds.has(data.chatId)) {
          adChatIds.add(data.chatId);
          adChatDataMap.set(data.chatId, {
            chatId: data.chatId,
            userId: data.senderId,
            userName: data.senderName,
            lastMessage: data.message,
            lastMessageTime: data.createdAt,
            machineryDetails: data.machineryDetails,
            chatType: 'ad'
          });
        }
      });
      
      const adChatsData: Chat[] = [];
      
      for (const chatId of Array.from(adChatIds)) {
        const chatData = adChatDataMap.get(chatId);
        
        // Fetch user data
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', chatData.userId)));
        let userEmail = 'unknown@email.com';
        
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          userEmail = userData.email;
        }
        
        console.log('Adding ad chat:', chatId, chatData);
        adChatsData.push({
          id: chatId,
          chatId: chatId,
          userId: chatData.userId,
          userName: chatData.userName,
          userEmail,
          machineryDetails: chatData.machineryDetails,
          lastMessage: chatData.lastMessage || 'No messages yet',
          lastMessageTime: chatData.lastMessageTime,
          unreadCount: 0,
          status: 'active'
        });
      }
      
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
    } catch (error) {
      console.error('Error fetching chats:', error);
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
      
      // Simplified query to avoid index requirement
      const messagesQuery = query(
        collection(db, 'chatMessages'), 
        where('chatId', '==', chatId)
      );
      
      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesData: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
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
        });
        
        // Sort messages by creation time (client-side)
        messagesData.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return aTime.getTime() - bTime.getTime();
        });
        
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
      const messageData = {
        chatId: selectedChat.chatId,
        senderId: 'admin',
        senderName: 'Admin',
        senderType: 'admin',
        message: newMessage.trim(),
        createdAt: serverTimestamp(),
        status: 'sent'
      };

      await addDoc(collection(db, 'chatMessages'), messageData);
      
      // Send notification to user
      await notifyUserAdminReply(
        selectedChat.userId,
        newMessage.trim(),
        selectedChat.chatId,
        selectedChat.machineryDetails
      );
      
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

