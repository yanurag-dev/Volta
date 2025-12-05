import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProducts,
  fetchProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkDeleteProducts,
} from '../services/products';

export function useProducts(filters = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts(filters),
    staleTime: 30000,
  });
}

export function useProduct(id) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.id] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useBulkDeleteProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkDeleteProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
