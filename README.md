# HeavyRent Admin Panel

A comprehensive admin panel for managing the HeavyRent mobile application, built with React.js and Material-UI.

## Features

### 🔐 Authentication
- Admin login with role-based access control
- Secure authentication using Firebase Auth
- Protected routes and session management

### 📊 Dashboard
- Real-time statistics and analytics
- Overview of ads, requests, users, and revenue
- Quick action buttons for common tasks

### 📝 Ad Management
- View all user-submitted ads
- Approve/reject ads with admin pricing
- Edit ad details and manage status
- Bulk operations support

### 📋 Request Management
- Manage rental requests from users
- Assign requests to appropriate admins
- Track request status and progress
- Payment verification system

### 💬 Chat System
- Real-time communication with users
- File sharing for payment receipts
- Chat history and message management
- Admin-user conversation tracking

### 👥 User Management
- View all registered users
- User verification and blocking
- User activity tracking
- Profile management

## Tech Stack

- **Frontend**: React.js with TypeScript
- **UI Framework**: Material-UI (MUI)
- **Backend**: Firebase (Firestore, Auth, Realtime Database)
- **Routing**: React Router DOM
- **Data Grid**: MUI X Data Grid
- **Charts**: MUI X Charts

## Setup Instructions

### 1. Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project setup

### 2. Installation
```bash
# Navigate to admin panel directory
cd admin-panel

# Install dependencies
npm install

# Start development server
npm start
```

### 3. Firebase Configuration
1. Copy your Firebase configuration from the mobile app
2. Update `src/firebase.ts` with your Firebase config
3. Ensure Firestore security rules allow admin access

### 4. Admin User Setup
1. Create an admin user in Firebase Auth
2. Add user document to Firestore with `role: 'admin'`
3. Use admin credentials to login

## Project Structure

```
admin-panel/
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── AdManagement.tsx
│   │   ├── RequestManagement.tsx
│   │   ├── ChatSystem.tsx
│   │   └── UserManagement.tsx
│   ├── firebase.ts
│   ├── App.tsx
│   └── index.tsx
├── package.json
└── README.md
```

## Database Structure

### Collections
- `users/` - User profiles and admin accounts
- `ads/` - Machinery advertisements
- `rentalRequests/` - Rental requests from users
- `chats/` - Chat conversations
- `messages/` - Individual chat messages

### Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin access to all collections
    match /{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Workflow

### Ad Approval Process
1. User submits ad → Status: "pending"
2. Admin reviews ad → Sets admin price
3. Admin approves → Status: "approved"
4. Ad becomes visible to users

### Rental Request Process
1. User requests rental → Status: "pending"
2. Admin assigns request → Status: "assigned"
3. User makes payment → Uploads receipt
4. Admin verifies payment → Status: "verified"
5. Admin completes rental → Status: "completed"

## Development

### Available Scripts
- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Environment Variables
Create `.env` file for environment-specific configurations:
```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
```

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting
firebase init hosting

# Deploy
firebase deploy
```

## Support

For issues and questions, please contact the development team.

## License

This project is proprietary software for HeavyRent application.