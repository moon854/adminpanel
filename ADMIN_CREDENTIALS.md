# 🔐 Admin Login Credentials

## ✅ Quick Setup (Recommended)

### Method 1: Use Admin Creation Page (Easiest)

1. **Start Admin Panel:**
   ```bash
   cd admin-panel
   npm start
   ```

2. **Open Browser:**
   - Go to: `http://localhost:3000/create-admin`
   - OR click "Don't have an admin account? Create one" on login page

3. **Fill in Admin Details:**
   - **Email:** `admin@heavyrent.com` (or your preferred email)
   - **Password:** `Admin@123456` (or your preferred password)
   - **First Name:** `Admin`
   - **Last Name:** `User`
   - **Phone:** `+923000000000` (optional)

4. **Click "Create Admin User"**

5. **Login:**
   - Go to: `http://localhost:3000/login`
   - Use the credentials you just created

---

### Method 2: Use Node.js Script

1. **Install Firebase SDK:**
   ```bash
   cd admin-panel
   npm install firebase
   ```

2. **Edit `create-admin.js`:**
   - Update `ADMIN_EMAIL`, `ADMIN_PASSWORD`, etc.

3. **Run Script:**
   ```bash
   node create-admin.js
   ```

4. **Login with credentials shown in console**

---

### Method 3: Firebase Console (Manual)

1. **Go to Firebase Console:**
   - https://console.firebase.google.com/
   - Select project: `heavyrent-f6435`

2. **Create Auth User:**
   - Go to Authentication → Users
   - Click "Add user"
   - Email: `admin@heavyrent.com`
   - Password: `Admin@123456`
   - Click "Add user"

3. **Create Firestore Document:**
   - Go to Firestore Database
   - Collection: `users`
   - Document ID: `[User UID from Authentication]`
   - Add fields:
     ```json
     {
       "uid": "[User UID]",
       "email": "admin@heavyrent.com",
       "firstName": "Admin",
       "lastName": "User",
       "phone": "+923000000000",
       "role": "admin",
       "verified": true,
       "status": "active",
       "createdAt": "[Current Date/Time]"
     }
     ```

4. **Login:**
   - Use credentials in admin panel

---

## 📋 Default Admin Credentials

**⚠️ Change these after first login for security!**

```
Email: admin@heavyrent.com
Password: Admin@123456
```

---

## 🔒 Security Note

**After creating admin user:**

1. **Remove CreateAdmin route** from `App.tsx` (for production)
2. **Delete `create-admin.js`** script (optional)
3. **Change default password** to something secure
4. **Enable Firebase Security Rules** to protect admin routes

---

## 🐛 Troubleshooting

### "Email already in use"
- User already exists in Firebase Auth
- Either login with existing credentials OR
- Update existing user's `role` field to `admin` in Firestore

### "Access denied. Admin privileges required"
- User exists but `role` is not `admin` in Firestore
- Update `users/[uid]/role` to `admin` in Firestore

### "User not found"
- User doesn't exist in Firestore `users` collection
- Create user document manually in Firestore

---

## ✅ Verification

After login, you should see:
- ✅ Dashboard with statistics
- ✅ Sidebar with all admin features
- ✅ User name displayed in top bar

If you see these, admin login is working! 🎉




