import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

interface Category {
  id: string;
  name: string;
  order: number;
  createdAt?: any;
  updatedAt?: any;
}

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryOrder, setCategoryOrder] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const categoriesRef = collection(db, 'categories');
      const q = query(categoriesRef, orderBy('order', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const categoriesData: Category[] = [];
      querySnapshot.forEach((doc) => {
        categoriesData.push({
          id: doc.id,
          ...doc.data()
        } as Category);
      });
      
      setCategories(categoriesData);
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Error fetching categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryOrder(category.order || 0);
    } else {
      setEditingCategory(null);
      setCategoryName('');
      // Auto-set order to last position
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.order || 0)) 
        : 0;
      setCategoryOrder(maxOrder + 1);
    }
    setOpenDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryOrder(0);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      setError('Category name is required');
      return;
    }

    // Check for duplicate names (excluding current category if editing)
    const duplicate = categories.find(
      cat => cat.name.toLowerCase().trim() === categoryName.toLowerCase().trim() &&
      cat.id !== editingCategory?.id
    );
    
    if (duplicate) {
      setError('This category name already exists');
      return;
    }

    try {
      setError(null);
      
      if (editingCategory) {
        // Update existing category
        const categoryRef = doc(db, 'categories', editingCategory.id);
        await updateDoc(categoryRef, {
          name: categoryName.trim(),
          order: categoryOrder,
          updatedAt: serverTimestamp()
        });
        setSuccess('Category updated successfully');
      } else {
        // Add new category
        await addDoc(collection(db, 'categories'), {
          name: categoryName.trim(),
          order: categoryOrder,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setSuccess('Category added successfully');
      }
      
      await fetchCategories();
      setTimeout(() => {
        handleCloseDialog();
      }, 1000);
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Error saving category');
    }
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      const categoryRef = doc(db, 'categories', categoryToDelete.id);
      await deleteDoc(categoryRef);
      setSuccess('Category deleted successfully');
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      await fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Error deleting category');
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  const handleOrderChange = async (categoryId: string, newOrder: number) => {
    if (newOrder < 1) {
      setError('Order must be at least 1');
      return;
    }

    try {
      const categoryRef = doc(db, 'categories', categoryId);
      await updateDoc(categoryRef, {
        order: newOrder,
        updatedAt: serverTimestamp()
      });
      await fetchCategories();
      setSuccess('Category order updated successfully');
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Error updating order');
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
          Category Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ backgroundColor: '#47D6FF', '&:hover': { backgroundColor: '#3ab8d6' } }}
        >
          Add Category
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          All Categories ({categories.length})
        </Typography>
        
        {categories.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              No categories available. Please add your first category.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                  <TableRow>
                  <TableCell><strong>Order</strong></TableCell>
                  <TableCell><strong>Category Name</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <DragIcon color="action" />
                        <TextField
                          type="number"
                          value={category.order || 0}
                          onChange={(e) => {
                            const newOrder = parseInt(e.target.value) || 0;
                            handleOrderChange(category.id, newOrder);
                          }}
                          size="small"
                          inputProps={{ min: 1, style: { textAlign: 'center', width: '60px' } }}
                          sx={{ width: '80px' }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {category.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="Edit">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenDialog(category)}
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(category)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Category Name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              margin="normal"
              required
              placeholder="e.g., Excavators, Cranes, etc."
              helperText="Category name that will be displayed in the app"
            />
            <TextField
              fullWidth
              type="number"
              label="Order"
              value={categoryOrder}
              onChange={(e) => setCategoryOrder(parseInt(e.target.value) || 0)}
              margin="normal"
              required
              inputProps={{ min: 1 }}
              helperText="Display order for categories (lower number will be shown first)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{ backgroundColor: '#47D6FF', '&:hover': { backgroundColor: '#3ab8d6' } }}
          >
            {editingCategory ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the category "<strong>{categoryToDelete?.name}</strong>"?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. Related machinery items may also be affected.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryManagement;

