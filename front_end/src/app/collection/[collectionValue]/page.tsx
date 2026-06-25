"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import ProductGrid from "@/components/product/ProductGrid";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ColorVariantListItem } from "@/types/product";
import Button from "@/components/ui/Button";

interface CollectionResponse {
  data: ColorVariantListItem[];
  pagination: {
    totalPages: number;
    currentPage: number;
    nextPage?: number;
    prevPage?: number;
    totalProducts: number;
  };
  collection: string;
}

export default function CollectionPage() {
  const params = useParams();
  const collectionValue = params.collectionValue as string;

  const [collectionData, setCollectionData] = useState<CollectionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (collectionValue) {
      fetchCollectionProducts();
    }
  }, [collectionValue]);

  const fetchCollectionProducts = async (page: number = 1) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/products/collection/${collectionValue}?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error('Failed to fetch collection products');
      }
      const data: CollectionResponse = await response.json();
      setCollectionData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getCollectionTitle = (collection: string) => {
    const titles: { [key: string]: string } = {
      'بهار': 'کالکشن بهار',
      'تابستان': 'کالکشن تابستان',
      'پاییز': 'کالکشن پاییز',
      'زمستان': 'کالکشن زمستان',
    };
    return titles[collection] || `کالکشن ${collection}`;
  };

  const getCollectionDescription = (collection: string) => {
    const descriptions: { [key: string]: string } = {
      'بهار': 'مجموعه‌ای از محصولات زیبا و رنگارنگ برای فصل بهار',
      'تابستان': 'لباس‌های خنک و راحت برای روزهای گرم تابستان',
      'پاییز': 'استایل‌های گرم و شیک برای روزهای پاییزی',
      'زمستان': 'پوشاک گرم و مد روز برای فصل سرد زمستان',
    };
    return descriptions[collection] || `محصولات ویژه کالکشن ${collection}`;
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-secondary-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-voxcina-blue rounded-full animate-spin"></div>
            </div>
            <p className="text-voxcina-blue">در حال بارگذاری...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !collectionData) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-voxcina-blue mb-4">خطا در بارگذاری</h1>
            <p className="text-gray-600 mb-6">{error || 'کالکشن یافت نشد'}</p>
            <Link href="/">
              <Button variant="primary">
                بازگشت به خانه
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-voxcina-blue to-primary-600 text-white py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <motion.h1
                className="text-4xl md:text-6xl font-bold mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {getCollectionTitle(collectionData.collection)}
              </motion.h1>

              <motion.p
                className="text-lg md:text-xl mb-8 text-white/90"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {getCollectionDescription(collectionData.collection)}
              </motion.p>


            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
          </div>
        </section>

        {/* Products Section */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            {collectionData.data.length === 0 ? (
              <div className="text-center py-16">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  محصولی در این کالکشن یافت نشد
                </h2>
                <p className="text-gray-600 mb-8">
                  در حال حاضر محصولی در این کالکشن موجود نیست.
                </p>
                <Link href="/products">
                  <Button variant="primary" size="lg">
                    مشاهده همه محصولات
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <ProductGrid
                  items={collectionData.data}
                  columns={4}
                  glassEffect={false}
                />

                {/* Pagination */}
                {collectionData.pagination.totalPages > 1 && (
                  <div className="mt-12 flex justify-center">
                    <div className="flex items-center gap-2">
                      {collectionData.pagination.prevPage && (
                        <Button
                          variant="outline"
                          onClick={() => fetchCollectionProducts(collectionData.pagination.prevPage)}
                        >
                          قبلی
                        </Button>
                      )}

                      <span className="px-4 py-2 bg-voxcina-blue text-white rounded-lg">
                        صفحه {collectionData.pagination.currentPage} از {collectionData.pagination.totalPages}
                      </span>

                      {collectionData.pagination.nextPage && (
                        <Button
                          variant="outline"
                          onClick={() => fetchCollectionProducts(collectionData.pagination.nextPage)}
                        >
                          بعدی
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
