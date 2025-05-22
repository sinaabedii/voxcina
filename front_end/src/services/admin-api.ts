import axios from 'axios';

// TypeScript interfaces
interface Brand {
  id?: string;
  _id?: string; // MongoDB may return this instead of id
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logo?: string | File; // Allow either string (URL) or File object
  isActive?: boolean;
  productsCount?: number;
  featuredProduct?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Product {
  id?: string;
  name: string;
  description?: string;
  price: number;
  categoryIds: string[];
  brandId: string;
  variants?: ProductVariant[];
  attributes?: ProductAttribute[];
  mainImages?: File[] | string[];
  galleryImages?: File[] | string[];
  isFlashSale?: boolean;
  isActive?: boolean;
}

interface ProductVariant {
  size: string;
  color: string;
  sku: string;
  quantity: number;
}

interface ProductAttribute {
  name: string;
  value: string;
}

interface Category {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: File | string;
  parentId?: string;
  isActive?: boolean;
}

interface Order {
  id?: string;
  status: string;
}

interface User {
  id?: string;
  role: string;
}

interface Discount {
  id?: string;
  code: string;
  discountPercent: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// Create an axios instance with default config
const apiClient = axios.create({
  baseURL: '/api',  // Using the Next.js API route which proxies to the backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Admin API methods
export const adminApi = {
  // Brands
  getBrands: async () => {
    const response = await apiClient.get('/brands');
    return response.data;
  },
  
  createBrand: async (brandData: Brand) => {
    // For brand creation with logo, use FormData
    const formData = new FormData();
    
    // Add text fields
    Object.keys(brandData).forEach(key => {
      if (key !== 'logo') {
        formData.append(key, String(brandData[key as keyof Brand]));
      }
    });
    
    // Add logo file if it exists and is a File object
    if (brandData.logo && typeof brandData.logo !== 'string') {
      formData.append('logo', brandData.logo as File);
    }
    
    const response = await apiClient.post('/brands', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  updateBrand: async (brandId: string, brandData: Brand) => {
    // For brand update with logo, use FormData
    const formData = new FormData();
    
    // Add text fields
    Object.keys(brandData).forEach(key => {
      if (key !== 'logo') {
        formData.append(key, String(brandData[key as keyof Brand]));
      }
    });
    
    // Add logo file if it exists and is a File object
    if (brandData.logo && typeof brandData.logo !== 'string') {
      formData.append('logo', brandData.logo as File);
    }
    
    const response = await apiClient.put(`/brands/${brandId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  deleteBrand: async (brandId: string) => {
    const response = await apiClient.delete(`/brands/${brandId}`);
    return response.data;
  },
  
  // Products
  getProducts: async (params = {}) => {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },
  
  getProductById: async (productId: string) => {
    const response = await apiClient.get(`/products/${productId}`);
    return response.data;
  },
  
  createProduct: async (productData: Product) => {
    // For multipart form data (products with images)
    const formData = new FormData();
    
    // Add JSON fields
    Object.keys(productData).forEach(key => {
      if (key !== 'mainImages' && key !== 'galleryImages') {
        // Handle arrays and objects by stringifying them
        if (typeof productData[key as keyof Product] === 'object') {
          formData.append(key, JSON.stringify(productData[key as keyof Product]));
        } else {
          formData.append(key, String(productData[key as keyof Product]));
        }
      }
    });
    
    // Add image files
    if (productData.mainImages) {
      productData.mainImages.forEach((image: File | string) => {
        if (image instanceof File) {
          formData.append('mainImages', image);
        }
      });
    }
    
    if (productData.galleryImages) {
      productData.galleryImages.forEach((image: File | string) => {
        if (image instanceof File) {
          formData.append('galleryImages', image);
        }
      });
    }
    
    const response = await apiClient.post('/admin/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  updateProduct: async (productId: string, productData: Partial<Product>) => {
    // Handle multipart form data similar to createProduct if needed
    const formData = new FormData();
    
    Object.keys(productData).forEach(key => {
      if (key !== 'mainImages' && key !== 'galleryImages') {
        if (typeof productData[key as keyof Product] === 'object') {
          formData.append(key, JSON.stringify(productData[key as keyof Product]));
        } else {
          formData.append(key, String(productData[key as keyof Product]));
        }
      }
    });
    
    // Add image files
    if (productData.mainImages) {
      productData.mainImages.forEach((image: File | string) => {
        if (image instanceof File) {
          formData.append('mainImages', image);
        }
      });
    }
    
    if (productData.galleryImages) {
      productData.galleryImages.forEach((image: File | string) => {
        if (image instanceof File) {
          formData.append('galleryImages', image);
        }
      });
    }
    
    const response = await apiClient.put(`/admin/products/${productId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  deleteProduct: async (productId: string) => {
    const response = await apiClient.delete(`/admin/products/${productId}`);
    return response.data;
  },
  
  // Categories
  getCategories: async () => {
    const response = await apiClient.get('/categories');
    return response.data;
  },
  
  createCategory: async (categoryData: Category) => {
    // For multipart form data (categories with images)
    const formData = new FormData();
    
    // Add text fields
    Object.keys(categoryData).forEach(key => {
      if (key !== 'image') {
        formData.append(key, String(categoryData[key as keyof Category]));
      }
    });
    
    // Add image file if exists
    if (categoryData.image && categoryData.image instanceof File) {
      formData.append('image', categoryData.image);
    }
    
    const response = await apiClient.post('/admin/categories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  updateCategory: async (categoryId: string, categoryData: Partial<Category>) => {
    // Handle similar to createCategory for multipart form data
    const formData = new FormData();
    
    Object.keys(categoryData).forEach(key => {
      if (key !== 'image') {
        formData.append(key, String(categoryData[key as keyof Category]));
      }
    });
    
    if (categoryData.image && categoryData.image instanceof File) {
      formData.append('image', categoryData.image);
    }
    
    const response = await apiClient.put(`/categories/${categoryId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },
  
  deleteCategory: async (categoryId: string) => {
    const response = await apiClient.delete(`/categories/${categoryId}`);
    return response.data;
  },
  
  // Orders
  getOrders: async (params = {}) => {
    // For admin, we'll need to implement a route to get all orders
    // For now, we're using the user's orders endpoint
    const response = await apiClient.get('/user/orders', { params });
    return response.data;
  },
  
  getOrderById: async (orderId: string) => {
    const response = await apiClient.get(`/orders/${orderId}`);
    return response.data;
  },
  
  updateOrderStatus: async (orderId: string, status: string) => {
    // This endpoint doesn't appear to exist in the routes.go
    // You'll need to implement it in the backend
    const response = await apiClient.put(`/admin/orders/${orderId}/status`, { status });
    return response.data;
  },
  
  // Users
  getUsers: async (params = {}) => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },
  
  getUserById: async (userId: string) => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },
  
  updateUserRole: async (userId: string, role: string) => {
    const response = await apiClient.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },
  
  deleteUser: async (userId: string) => {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return response.data;
  },
  
  // Discounts
  getDiscounts: async () => {
    const response = await apiClient.get('/discounts');
    return response.data;
  },
  
  createDiscount: async (discountData: Discount) => {
    const response = await apiClient.post('/discounts', discountData);
    return response.data;
  },
  
  updateDiscount: async (discountId: string, discountData: Partial<Discount>) => {
    const response = await apiClient.put(`/discounts/${discountId}`, discountData);
    return response.data;
  },
  
  deleteDiscount: async (discountId: string) => {
    const response = await apiClient.delete(`/discounts/${discountId}`);
    return response.data;
  },
  
  // Dashboard stats - this endpoint doesn't appear to exist in routes.go
  // You'll need to implement it in the backend
  getDashboardStats: async () => {
    // For now, we'll use a mock endpoint
    const response = await apiClient.get('/admin/stats');
    return response.data;
  },
};

export default adminApi; 