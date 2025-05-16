import React from "react";
import { Trash2, Minus, Plus } from "lucide-react";
import { CartItem as CartItemType } from "@/types/cart";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";

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
    removeItem(item.id);
  };

  return (
    <div className="py-4 flex flex-col sm:flex-row">
      <div className="w-full sm:w-24 h-24 mb-4 sm:mb-0">
        {item.product.images && item.product.images.length > 0 ? (
          <div className="relative h-24 w-24 rounded-md overflow-hidden">
            <div className="h-full w-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500 text-xs">تصویر محصول</span>
            </div>
          </div>
        ) : (
          <div className="h-24 w-24 bg-muted rounded-md flex items-center justify-center">
            <span className="text-muted-foreground text-xs">بدون تصویر</span>
          </div>
        )}
      </div>

      <div className="flex-grow sm:mr-4">
        <h3 className="font-medium">{item.product.name}</h3>

        <div className="text-sm text-muted-foreground mt-1">
          {item.size && <span className="ml-4">سایز: {item.size}</span>}
          {item.color && (
            <span>
              رنگ:{" "}
              <span
                className="inline-block w-3 h-3 rounded-full ml-1"
                style={{ backgroundColor: item.color, verticalAlign: "middle" }}
              />
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="font-medium">{formatPrice(item.price)}</div>

          <div className="flex items-center">
            <div className="flex items-center border border-border rounded-md">
              <button
                className="px-2 py-1 text-muted-foreground"
                onClick={handleDecreaseQuantity}
                aria-label="کاهش تعداد"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="px-3 py-1">{item.quantity}</span>
              <button
                className="px-2 py-1 text-muted-foreground"
                onClick={handleIncreaseQuantity}
                aria-label="افزایش تعداد"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>

            <button
              className="mr-2 text-muted-foreground hover:text-destructive transition-colors"
              onClick={handleRemoveItem}
              aria-label="حذف از سبد خرید"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
