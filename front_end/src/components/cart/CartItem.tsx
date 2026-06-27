import React from "react";
import { Trash2, Minus, Plus, ShoppingBag, Package } from "lucide-react";
import { CartItem as CartItemType } from "@/types/cart";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { motion } from "framer-motion";
import Image from "next/image";
import { getCartItemImage, getCartItemVariant } from "@/lib/product-variants";

interface CartItemProps {
  item: CartItemType;
}

const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { removeItem, increaseQuantity, decreaseQuantity } = useCart();

  const handleIncreaseQuantity = () => {
    increaseQuantity(item.id);
  };

  const handleDecreaseQuantity = () => {
    decreaseQuantity(item.id);
  };

  const handleRemoveItem = () => {
    if (window.confirm('آیا از حذف این محصول از سبد خرید اطمینان دارید؟')) {
      removeItem(item.id);
    }
  };

  return (
    <motion.div 
      className="py-4 flex flex-col sm:flex-row border-b border-border/10 last:border-b-0"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <div className="w-full sm:w-24 h-24 mb-4 sm:mb-0">
        {(() => {
	          const imageSrc = getCartItemImage(item);
          
          return imageSrc ? (
            <motion.div 
              className="relative h-24 w-24 rounded-xl overflow-hidden shadow-soft border border-border/10 group"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="h-full w-full bg-secondary/30 flex items-center justify-center overflow-hidden">
                <Image 
                  src={imageSrc} 
                  alt={item.product.name}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                />
              </div>
            </motion.div>
          ) : (
            <div className="h-24 w-24 bg-secondary/30 rounded-xl flex items-center justify-center shadow-soft border border-border/10">
              <Package className="h-8 w-8 text-primary/40" />
            </div>
          );
        })()}
      </div>

      <div className="flex-grow sm:mr-4">
        <h3 className="font-medium text-foreground hover:text-primary transition-colors duration-200">{item.product.name}</h3>

        <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2">
          {item.size && (
            <span className="bg-secondary/50 px-2 py-0.5 rounded-md text-xs">
              سایز: {item.size}
            </span>
          )}
	          {(item.color || item.colorName) && (
	            <span className="bg-secondary/50 px-2 py-0.5 rounded-md text-xs flex items-center">
	              رنگ:
	              <span
	                className="inline-block w-3 h-3 rounded-full mr-1 ml-1 border border-border/20 overflow-hidden"
	                style={(() => {
	                  const variant = getCartItemVariant(item);
	                  const hex = item.color?.startsWith('#') ? item.color : variant?.color?.startsWith('#') ? variant.color : undefined;
	                  return hex ? { backgroundColor: hex } : {};
	                })()}
	              >
	                {getCartItemVariant(item)?.swatchImage ? (
	                  <img src={getCartItemVariant(item)?.swatchImage} alt="" className="w-full h-full object-cover" />
	                ) : null}
	              </span>
	              {(item.colorName || getCartItemVariant(item)?.colorName) && (
	                <span className="mr-1">
	                  {item.colorName || getCartItemVariant(item)?.colorName}
	                </span>
	              )}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="font-medium text-primary">{formatPrice(item.price)}</div>

          <div className="flex items-center">
            <div className="flex items-center border border-border/20 rounded-lg shadow-soft overflow-hidden">
              <motion.button
                whileHover={{ backgroundColor: 'rgba(26, 60, 105, 0.05)' }}
                whileTap={{ scale: 0.95 }}
                className="px-2 py-1 text-muted-foreground hover:text-primary transition-colors duration-200"
                onClick={handleDecreaseQuantity}
                aria-label="کاهش تعداد"
                disabled={item.quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </motion.button>
              <span className="px-3 py-1 border-x border-border/10 font-medium">{item.quantity}</span>
              <motion.button
                whileHover={{ backgroundColor: 'rgba(26, 60, 105, 0.05)' }}
                whileTap={{ scale: 0.95 }}
                className="px-2 py-1 text-muted-foreground hover:text-primary transition-colors duration-200"
                onClick={handleIncreaseQuantity}
                aria-label="افزایش تعداد"
              >
                <Plus className="h-3 w-3" />
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.1, color: '#ef4444' }}
              whileTap={{ scale: 0.95 }}
              className="mr-3 text-muted-foreground hover:text-destructive transition-colors duration-200"
              onClick={handleRemoveItem}
              aria-label="حذف از سبد خرید"
            >
              <Trash2 className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground flex items-center">
          <ShoppingBag className="h-3 w-3 ml-1" />
          موجود در انبار: {item.product.inStock ? 'بله' : 'خیر'}
        </div>
      </div>
    </motion.div>
  );
};

export default CartItem;
