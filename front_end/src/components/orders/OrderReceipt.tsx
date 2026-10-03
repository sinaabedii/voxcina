import Image from "next/image";
import { getPaymentMethodText } from "@/lib/order-display";
import { formatDate, formatPrice, toPersianNumber } from "@/lib/utils";
import type { OrderReceipt as Receipt } from "@/types/order-receipt";
import styles from "./order-receipt.module.css";

/** Shared JSX only: order/address text is escaped by React, never raw HTML. */
export default function OrderReceipt({ receipt }: { receipt: Receipt }) {
  const address = receipt.shipping_address || {};
  const recipient = [address.first_name, address.last_name].filter(Boolean).join(" ");
  const region = [address.province || address.state, address.city].filter(Boolean).join("، ");
  const shippingMethod = receipt.shipping_method?.trim();
  const subtotal = receipt.items.reduce((sum, item) => sum + item.quantity * item.price_at_purchase, 0);

  return (
    <article className={styles.sheet} dir="rtl" aria-label={`فاکتور سفارش ${receipt.order_number}`}>
      <header className={styles.letterhead}>
        <div className={styles.identity}>
          <Image src="/images/Logo/BlueXTransparent.png" alt="" width={56} height={56} priority className={styles.logo} />
          <div>
            <p className={styles.brand}>وکسینا</p>
            <p className={styles.wordmark} dir="ltr">VOXCINA</p>
            <p className={styles.tagline}>فروشگاه آنلاین پوشاک</p>
          </div>
        </div>
        <div className={styles.orderIdentity}>
          <h1>فاکتور سفارش</h1>
          <p className={styles.orderNumber} dir="ltr">{receipt.order_number}</p>
          <p className={styles.date}>تاریخ ثبت: {receipt.jalali_created_at || formatDate(receipt.created_at)}</p>
        </div>
      </header>

      <section className={styles.recipient} aria-labelledby="receipt-recipient">
        <div className={styles.recipientHeading}>
          <h2 id="receipt-recipient">گیرنده و نشانی تحویل</h2>
          {address.phone_number && <span dir="ltr">{address.phone_number}</span>}
        </div>
        <p className={styles.recipientName}>{recipient || "نام گیرنده ثبت نشده"}</p>
        <p>{[region, address.address || address.street].filter(Boolean).join("، ") || "نشانی ثبت نشده"}</p>
        <div className={styles.addressCodes}>
          {address.postal_code && <span>کد پستی: <bdi>{address.postal_code}</bdi></span>}
          {shippingMethod && <span>روش ارسال: <bdi>{shippingMethod}</bdi></span>}
        </div>
      </section>

      <section className={styles.items} aria-labelledby="receipt-items">
        <div className={styles.sectionHeading}>
          <h2 id="receipt-items">اقلام سفارش</h2>
          <span>مبالغ به تومان</span>
        </div>
        <table className={styles.table}>
          <colgroup><col /><col className={styles.quantityCol} /><col className={styles.priceCol} /><col className={styles.priceCol} /></colgroup>
          <thead><tr><th scope="col">شرح کالا</th><th scope="col">تعداد</th><th scope="col">قیمت واحد</th><th scope="col">جمع</th></tr></thead>
          <tbody>
            {receipt.items.map((item, index) => (
              <tr key={`${item.product.id}:${item.variant.variantId || ""}:${index}`}>
                <td>
                  <div className={styles.productName}><span className={styles.rowNumber}>{toPersianNumber(index + 1)}.</span> {item.product.name || "کالا"}</div>
                  <p className={styles.variant}>
                    {[item.variant.size && `سایز ${item.variant.size}`, (item.variant.colorName || item.variant.color) && `رنگ ${item.variant.colorName || item.variant.color}`].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {item.variant.sku && <p className={styles.sku}>کد کالا: <bdi>{item.variant.sku}</bdi></p>}
                </td>
                <td>{toPersianNumber(item.quantity)}</td>
                <td>{formatPrice(item.price_at_purchase)}</td>
                <td className={styles.lineTotal}>{formatPrice(item.price_at_purchase * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.summary} aria-label="خلاصه پرداخت">
        <div className={styles.payment}>
          <h2>اطلاعات پرداخت</h2>
          <p>{getPaymentMethodText(receipt)}</p>
        </div>
        <dl className={styles.totals}>
          <div><dt>جمع کالاها</dt><dd>{formatPrice(subtotal)}</dd></div>
          <div><dt>هزینه ارسال</dt><dd>{receipt.shipping_cost ? formatPrice(receipt.shipping_cost) : "رایگان"}</dd></div>
          {receipt.tax_amount > 0 && <div><dt>مالیات</dt><dd>{formatPrice(receipt.tax_amount)}</dd></div>}
          {receipt.discount_amount > 0 && <div><dt>تخفیف</dt><dd>− {formatPrice(receipt.discount_amount)}</dd></div>}
          <div className={styles.grandTotal}><dt>مبلغ کل سفارش</dt><dd>{formatPrice(receipt.total_amount)}</dd></div>
        </dl>
      </section>

      <footer className={styles.footer}>
        <p>از خرید شما از وکسینا سپاسگزاریم.</p>
        <span dir="ltr">voxcina.com</span>
      </footer>
    </article>
  );
}
