import { collection, addDoc, serverTimestamp, query, getDocs, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface MachineryDetails {
  id: string;
  name: string;
  category: string;
  price: string;
  location: string;
  imageUrl: string;
}

// Send notification to user when admin replies
export const notifyUserAdminReply = async (userId: string, message: string, chatId: string, machineryDetails: MachineryDetails | null = null) => {
  try {
    const notificationData = {
      userId: userId,
      type: 'admin_reply',
      title: 'Admin Reply',
      message: message,
      chatId: chatId,
      machineryDetails: machineryDetails,
      status: 'unread',
      createdAt: serverTimestamp(),
      readAt: null
    };

    await addDoc(collection(db, 'userNotifications'), notificationData);
    console.log('User notification sent successfully');
  } catch (error) {
    console.error('Error sending user notification:', error);
  }
};

// Send notification to admin when user sends message
export const notifyAdminNewMessage = async (
  userId: string, 
  userName: string, 
  message: string, 
  chatId: string, 
  machineryDetails: MachineryDetails | null = null
) => {
  try {
    const notificationData = {
      type: 'new_message',
      title: machineryDetails ? `New inquiry about ${machineryDetails.name}` : 'New general message',
      message: `${userName}: ${message}`,
      userId: userId,
      userName: userName,
      chatId: chatId,
      machineryDetails: machineryDetails,
      status: 'unread',
      createdAt: serverTimestamp(),
      readAt: null
    };

    await addDoc(collection(db, 'adminNotifications'), notificationData);
    console.log('Admin notification sent successfully');
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
};

// Count unread chat messages for admin
export const getUnreadChatCount = async (): Promise<number> => {
  try {
    // Get admin notifications for new messages
    const notificationsQuery = query(
      collection(db, 'adminNotifications'),
      where('type', '==', 'new_message'),
      where('status', '==', 'unread')
    );
    
    const notificationsSnapshot = await getDocs(notificationsQuery);
    return notificationsSnapshot.size;
  } catch (error) {
    console.error('Error getting unread chat count:', error);
    return 0;
  }
};

// Mark chat notifications as read when admin opens chat
export const markChatNotificationsAsRead = async (chatId?: string) => {
  try {
    let queryRef;
    
    if (chatId) {
      // Mark specific chat notifications as read
      queryRef = query(
        collection(db, 'adminNotifications'),
        where('type', '==', 'new_message'),
        where('chatId', '==', chatId),
        where('status', '==', 'unread')
      );
    } else {
      // Mark all chat notifications as read
      queryRef = query(
        collection(db, 'adminNotifications'),
        where('type', '==', 'new_message'),
        where('status', '==', 'unread')
      );
    }
    
    const snapshot = await getDocs(queryRef);
    const updatePromises = snapshot.docs.map((docSnapshot) => {
      return updateDoc(doc(db, 'adminNotifications', docSnapshot.id), {
        status: 'read',
        readAt: serverTimestamp()
      });
    });
    
    await Promise.all(updatePromises);
    console.log(`Marked ${snapshot.size} chat notifications as read`);
  } catch (error) {
    console.error('Error marking chat notifications as read:', error);
  }
};

// Count unread general support messages (no machinery details)
export const getUnreadGeneralSupportCount = async (): Promise<number> => {
  try {
    const notificationsQuery = query(
      collection(db, 'adminNotifications'),
      where('type', '==', 'new_message'),
      where('status', '==', 'unread')
    );
    
    const notificationsSnapshot = await getDocs(notificationsQuery);
    let generalCount = 0;
    
    notificationsSnapshot.forEach((doc) => {
      const data = doc.data();
      const chatId = data.chatId;
      // Count notifications where chatId starts with 'general_' or 'admin_initiated_'
      if (chatId?.startsWith('general_') || chatId?.startsWith('admin_initiated_')) {
        generalCount++;
      }
    });
    
    return generalCount;
  } catch (error) {
    console.error('Error getting unread general support count:', error);
    return 0;
  }
};

// Count unread machinery inquiry messages (with machinery details)
export const getUnreadMachineryInquiriesCount = async (): Promise<number> => {
  try {
    const notificationsQuery = query(
      collection(db, 'adminNotifications'),
      where('type', '==', 'new_message'),
      where('status', '==', 'unread')
    );
    
    const notificationsSnapshot = await getDocs(notificationsQuery);
    let machineryCount = 0;
    
    notificationsSnapshot.forEach((doc) => {
      const data = doc.data();
      const chatId = data.chatId;
      // Count notifications where chatId starts with 'machinery_'
      if (chatId?.startsWith('machinery_')) {
        machineryCount++;
      }
    });
    
    return machineryCount;
  } catch (error) {
    console.error('Error getting unread machinery inquiries count:', error);
    return 0;
  }
};
