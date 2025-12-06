import api from './api';

// Helper function to validate ID parameter
const validateId = (id, paramName = 'id') => {
  if (!id || (typeof id !== 'string' && typeof id !== 'number')) {
    throw new Error(`${paramName} is required and must be a valid string or number`);
  }
};

// Helper function to validate product object
const validateProduct = (product, requiredFields = []) => {
  if (!product || typeof product !== 'object') {
    throw new Error('product must be a valid object');
  }

  const missingFields = requiredFields.filter(field => !product[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
};

// Helper function to handle API errors consistently
const handleApiError = (error, operation) => {
  const status = error.response?.status;
  const message = error.response?.data?.message || error.message;
  const details = error.response?.data?.details || error.response?.data;

  const enhancedError = new Error(`${operation} failed: ${message}`);
  enhancedError.status = status;
  enhancedError.details = details;
  enhancedError.originalError = error;

  throw enhancedError;
};

export const fetchProducts = async (params = {}) => {
  try {
    const response = await api.get('/products/', { params });
    return response.data;
  } catch (error) {
    handleApiError(error, 'Fetching products');
  }
};

export const fetchProduct = async (id) => {
  try {
    validateId(id);
    const response = await api.get(`/products/${id}/`);
    return response.data;
  } catch (error) {
    if (error.message.includes('id is required')) {
      throw error;
    }
    handleApiError(error, 'Fetching product');
  }
};

export const createProduct = async (product) => {
  try {
    validateProduct(product, ['sku', 'name']);
    const response = await api.post('/products/', product);
    return response.data;
  } catch (error) {
    if (error.message.includes('required')) {
      throw error;
    }
    handleApiError(error, 'Creating product');
  }
};

export const updateProduct = async (id, product) => {
  try {
    validateId(id);
    validateProduct(product, ['sku', 'name']);
    const response = await api.put(`/products/${id}/`, product);
    return response.data;
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('id is required')) {
      throw error;
    }
    handleApiError(error, 'Updating product');
  }
};

export const partialUpdateProduct = async (id, product) => {
  try {
    validateId(id);
    validateProduct(product);
    const response = await api.patch(`/products/${id}/`, product);
    return response.data;
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('id is required')) {
      throw error;
    }
    handleApiError(error, 'Partially updating product');
  }
};

export const deleteProduct = async (id) => {
  try {
    validateId(id);
    const response = await api.delete(`/products/${id}/`);
    return response.data;
  } catch (error) {
    if (error.message.includes('id is required')) {
      throw error;
    }
    handleApiError(error, 'Deleting product');
  }
};

export const bulkDeleteProducts = async () => {
  try {
    const response = await api.delete('/products/bulk-delete/');
    return response.data;
  } catch (error) {
    handleApiError(error, 'Bulk deleting products');
  }
};
