// Admin User Creation Script
// Run this script once to create an admin user
// Usage: node create-admin.js

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase configuration - Same as admin panel
const firebaseConfig = {
  apiKey: "AIzaSyAlGwcCqEWD74fzM2e5rz0LfO4u3aPoqyU",
  authDomain: "heavyrent-f6435.firebaseapp.com",
  projectId: "heavyrent-f6435",
  storageBucket: "heavyrent-f6435.firebasestorage.app",
  messagingSenderId: "371723438381",
  appId: "1:371723438381:web:d8a40803d5e62ac6452ba4",
  measurementId: "G-JPJRGFK53B",
  databaseURL: "https://heavyrent-f6435-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Admin credentials - CHANGE THESE!
const ADMIN_EMAIL = 'admin@heavyrent.com';
const ADMIN_PASSWORD = 'Admin@123456';
const ADMIN_FIRST_NAME = 'Admin';
const ADMIN_LAST_NAME = 'User';
const ADMIN_PHONE = '+923000000000';

async function createAdminUser() {
  try {
    console.log('🚀 Creating admin user...');
    console.log('📧 Email:', ADMIN_EMAIL);
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      ADMIN_EMAIL,
      ADMIN_PASSWORD
    );
    
    const user = userCredential.user;
    console.log('✅ User created in Firebase Auth:', user.uid);
    
    // Create user document in Firestore with admin role
    const userData = {
      uid: user.uid,
      email: ADMIN_EMAIL,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      phone: ADMIN_PHONE,
      role: 'admin',
      createdAt: new Date().toISOString(),
      verified: true,
      status: 'active'
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    console.log('✅ Admin user document created in Firestore');
    
    console.log('\n🎉 Admin user created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ You can now login to admin panel with these credentials!');
    
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.error('❌ Error: This email is already registered!');
      console.log('\n💡 Options:');
      console.log('1. Use a different email');
      console.log('2. Update existing user to admin role in Firestore');
      console.log('3. Or login with existing credentials');
    } else {
      console.error('❌ Error creating admin user:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
createAdminUser();




