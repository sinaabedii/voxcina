import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ClientBrandsPage from './client';

// Define the Brand interface
interface Brand {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logo?: string;
  isActive?: boolean;
  productsCount?: number;
  featuredProduct?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function getBrands() {
  const cookieStore = cookies();
  const token = cookieStore.get('authToken')?.value;
  
  if (!token) {
    redirect('/sign-in');
  }

  try {
    // Use server environment variable for backend URL
    const apiUrl = process.env.GO_BACKEND_URL || 'http://server:8080';
    const response = await fetch(`${apiUrl}/api/v1/brands`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        redirect('/sign-in');
      }
      throw new Error(`Failed to fetch brands: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
}

export default async function AdminBrandsPage() {
  const brands = await getBrands();
  
  return <ClientBrandsPage initialBrands={brands} />;
} 