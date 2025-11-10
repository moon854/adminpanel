import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { AdminPanelSettings, PersonAdd } from '@mui/icons-material';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const CreateAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@heavyrent.com');
  const [password, setPassword] = useState('Admin@123456');
  const [firstName, setFirstName] = useState('Admin');
  const [lastName, setLastName] = useState('User');
  const [phone, setPhone] = useState('+923000000000');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user document already exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        // Update existing user to admin
        await setDoc(doc(db, 'users', user.uid), {
          ...userDoc.data(),
          role: 'admin',
          firstName,
          lastName,
          phone,
          verified: true,
          status: 'active'
        }, { merge: true });
        setSuccess('✅ Existing user updated to admin role!');
      } else {
        // Create new admin user document
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: email,
          firstName,
          lastName,
          phone,
          role: 'admin',
          createdAt: new Date().toISOString(),
          verified: true,
          status: 'active'
        });
        setSuccess('✅ Admin user created successfully!');
      }
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. You can login with existing credentials or update the user to admin role in Firestore.');
      } else {
        setError(error.message || 'Error creating admin user');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <PersonAdd sx={{ fontSize: 60, color: '#47D6FF', mb: 2 }} />
            <Typography component="h1" variant="h4" sx={{ mb: 1, color: '#47D6FF', fontWeight: 'bold' }}>
              Create Admin User
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              ⚠️ This page should be removed after creating admin user for security
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box component="form" onSubmit={handleCreateAdmin} sx={{ width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                helperText="Minimum 6 characters"
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="firstName"
                label="First Name"
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="lastName"
                label="Last Name"
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
              />
              <TextField
                margin="normal"
                fullWidth
                id="phone"
                label="Phone Number"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: 3, 
                  mb: 2, 
                  backgroundColor: '#47D6FF',
                  '&:hover': {
                    backgroundColor: '#3BC4E6',
                  },
                  height: 50,
                  fontSize: '16px'
                }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Admin User'}
              </Button>
              <Divider sx={{ my: 2 }} />
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{ 
                  borderColor: '#47D6FF',
                  color: '#47D6FF',
                  '&:hover': {
                    borderColor: '#3BC4E6',
                    backgroundColor: 'rgba(71, 214, 255, 0.04)'
                  }
                }}
              >
                Back to Login
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default CreateAdmin;




