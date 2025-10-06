import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
