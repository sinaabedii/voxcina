import { useCallback, useState, useEffect } from "react";
import { Product } from "@/types/product";
import ProductGridItem from "./ProductGridItem";
import { useCartStore } from "@/store/cart-store";
import { useDashboardStore } from "@/store/dashboard-store";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { X, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

interface ProductGridProps {
  products: Product[];
  columns?: 2 | 3 | 4 | 5;
  glassEffect?: boolean;
}

/**
 * گرید محصولات بهینه‌سازی شده برای سئو
 */
export default function ProductGrid({
  products,
  columns = 4,
  glassEffect = false,
}: ProductGridProps) {
  const { addItem } = useCartStore();
  const { addToFavorites, isFavorite } = useDashboardStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [availableSizesForSelectedColor, setAvailableSizesForSelectedColor] = useState<string[]>([]);
  const [availableColorsForSelectedSize, setAvailableColorsForSelectedSize] = useState<string[]>([]);

  // Check if a specific variant is in stock
  const isVariantInStock = (size: string, color: string) => {
    if (!selectedProduct?.variants) return false;
    return selectedProduct.variants.some(
      v => v.size === size && v.color === color && v.quantity > 0
    );
  };

  const handleOpenModal = useCallback((product: Product) => {
    setSelectedProduct(product);
    setSelectedColor(null);
    setSelectedSize(null);
    
    if (product.variants && product.variants.length > 0) {
      // Get unique sizes and colors from variants that have quantity > 0
      const inStockVariants = product.variants.filter(v => v.quantity > 0);
      
      const uniqueSizes = [...new Set(inStockVariants.map(v => v.size))];
      const uniqueColors = [...new Set(inStockVariants.map(v => v.color))];
      
      setAvailableSizes(uniqueSizes);
      setAvailableColors(uniqueColors);
      
      // Initial values for filtered lists match the full lists
      setAvailableSizesForSelectedColor(uniqueSizes);
      setAvailableColorsForSelectedSize(uniqueColors);
    }
    
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setSelectedColor(null);
    setSelectedSize(null);
  }, []);

  const showNotification = (message: string) => {
    toast.success(message);
  };

  // Get available sizes based on selected color
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateAvailableSizes = useCallback(() => {
    if (selectedProduct?.variants && selectedColor) {
      const filteredSizes = [
        ...new Set(
          selectedProduct.variants
            .filter(v => v.color === selectedColor && v.quantity > 0)
            .map(v => v.size)
        )
      ];
      setAvailableSizesForSelectedColor(filteredSizes);
      
      // If current selected size is not available with the new color, reset it
      if (selectedSize && !filteredSizes.includes(selectedSize)) {
        setSelectedSize(null);
      }
    } else {
      setAvailableSizesForSelectedColor(availableSizes);
    }
  }, [selectedColor, selectedProduct, availableSizes, selectedSize]);

  // Get available colors based on selected size
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateAvailableColors = useCallback(() => {
    if (selectedProduct?.variants && selectedSize) {
      const filteredColors = [
        ...new Set(
          selectedProduct.variants
            .filter(v => v.size === selectedSize && v.quantity > 0)
            .map(v => v.color)
        )
      ];
      setAvailableColorsForSelectedSize(filteredColors);
      
      // If current selected color is not available with the new size, reset it
      if (selectedColor && !filteredColors.includes(selectedColor)) {
        setSelectedColor(null);
      }
    } else {
      setAvailableColorsForSelectedSize(availableColors);
    }
  }, [selectedSize, selectedProduct, availableColors, selectedColor]);

  // Update available sizes when color changes
  useEffect(() => {
    updateAvailableSizes();
  }, [selectedColor, updateAvailableSizes]);

  // Update available colors when size changes
  useEffect(() => {
    updateAvailableColors();
  }, [selectedSize, updateAvailableColors]);

  const handleAddToCart = useCallback(
    (product: Product) => {
      // If product has variants, show modal to select size/color
      if (product.variants && product.variants.length > 0) {
        handleOpenModal(product);
      } else {
        // Direct add for products without variants
        addItem(product, 1);
        showNotification("محصول به سبد خرید اضافه شد");
      }
    },
    [addItem, handleOpenModal]
  );

  const handleModalAddToCart = () => {
    if (selectedProduct && selectedColor && selectedSize && isVariantInStock(selectedSize, selectedColor)) {
      addItem(selectedProduct, 1, selectedSize, selectedColor);
      handleCloseModal();
      showNotification("محصول به سبد خرید اضافه شد");
    }
  };

  const handleAddToFavorites = useCallback(
    (productId: string) => {
      addToFavorites(productId);
    },
    [addToFavorites]
  );

  // تنظیم تعداد ستون‌ها
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  };

  return (
    <>
      <div className={`grid ${gridCols[columns]} gap-4 md:gap-6`}>
        {products.map((product, index) => (
          <ProductGridItem
            key={product.id}
            product={product}
            index={index}
            glassEffect={glassEffect}
            onAddToCart={handleAddToCart}
            onAddToFavorites={handleAddToFavorites}
            isFavorite={product.id ? isFavorite(product.id) : false}
          />
        ))}
      </div>

      {isModalOpen && selectedProduct && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal}
          title="انتخاب رنگ و سایز"
        >
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mt-1">
              لطفاً رنگ و سایز مورد نظر را برای {selectedProduct.name} انتخاب کنید
            </p>
          </div>

          {/* Size selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 text-primary">سایز</h3>
            <div className="flex flex-wrap gap-2">
              {availableSizesForSelectedColor.map((size) => (
                <button
                  key={size}
                  className={`px-4 py-2 border rounded-md text-sm transition-all duration-200 ${
                    selectedSize === size
                      ? "border-primary bg-primary/10 text-primary shadow-soft"
                      : "border-border/20 text-foreground hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Color selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2 text-primary">رنگ</h3>
            <div className="flex flex-wrap gap-2">
              {availableColorsForSelectedSize.map((colorCode) => (
                <button
                  key={colorCode}
                  className={`w-8 h-8 rounded-full border-2 shadow-soft transition-all duration-200 ${
                    selectedColor === colorCode
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-primary/20"
                  }`}
                  style={{ backgroundColor: colorCode }}
                  onClick={() => setSelectedColor(colorCode)}
                  title={colorCode}
                />
              ))}
            </div>
          </div>

          {/* Warning for unavailable variant */}
          {selectedColor && selectedSize && !isVariantInStock(selectedSize, selectedColor) && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mt-0.5 ml-2 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ترکیب رنگ و سایز انتخابی در حال حاضر ناموجود است. لطفاً ترکیب دیگری را انتخاب کنید.
              </p>
            </div>
          )}

          {/* Add to cart button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleModalAddToCart}
            disabled={!selectedColor || !selectedSize || !isVariantInStock(selectedSize!, selectedColor!)}
            className="rounded-xl mt-2"
          >
            تایید و افزودن به سبد
          </Button>
        </Modal>
      )}
    </>
  );
}