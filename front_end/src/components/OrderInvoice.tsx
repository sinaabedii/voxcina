import { Order } from "@/types/order";
import { formatPrice } from "@/lib/utils";

interface OrderInvoiceProps {
  order: Order;
}

export function downloadInvoice(order: Order) {
  const baseUrl = window.location.origin;
  const invoiceHTML = generateInvoiceHTML(order, baseUrl);
  
  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  if (!printWindow) {
    alert('لطفاً پنجره‌های بازشو را فعال کنید');
    return;
  }

  printWindow.document.write(invoiceHTML);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}

function generateInvoiceHTML(order: Order, baseUrl: string): string {
  const itemsTotal = order.items.reduce((sum, item) => sum + (item.price_at_purchase * item.quantity), 0);
  const shippingCost = order.shipping_cost || 0;
  const discount = order.discount_amount || 0;
  const total = order.total_amount;

  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    shipped: '#3b82f6',
    delivered: '#10b981',
    cancelled: '#ef4444',
    refunded: '#ef4444',
  };

  const statusColor = statusColors[order.status] || '#6b7280';

  const itemsHTML = order.items.map((item, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 6px 4px; text-align: center; color: #6b7280; font-size: 11px;">${idx + 1}</td>
      <td style="padding: 6px 4px; font-weight: 500; color: #1f2937; font-size: 11px;">${item.product.name}</td>
      <td style="padding: 6px 4px; text-align: center; color: #6b7280; font-size: 11px;">
        ${item.variant.size} ${item.variant.colorName ? `- ${item.variant.colorName}` : ''}
      </td>
      <td style="padding: 6px 4px; text-align: center; color: #6b7280; font-size: 11px;">${item.quantity}</td>
      <td style="padding: 6px 4px; text-align: left; color: #1f2937; font-size: 11px;">${formatPrice(item.price_at_purchase)}</td>
      <td style="padding: 6px 4px; text-align: left; font-weight: 600; color: #1f2937; font-size: 11px;">
        ${formatPrice(item.price_at_purchase * item.quantity)}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاکتور سفارش ${order.order_number}</title>
  <base href="${baseUrl}">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f9fafb;
      padding: 5px;
      color: #1f2937;
      line-height: 1.4;
    }
    
    .invoice {
      max-width: 100%;
      margin: 0 auto;
      background: white;
    }
    
    .header {
      background: linear-gradient(135deg, #1a3c69 0%, #2d5a9e 100%);
      color: white;
      padding: 16px 20px;
      position: relative;
    }
    
    .header-content {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .logo {
      width: 45px;
      height: 45px;
      background: white;
      border-radius: 8px;
      padding: 5px;
    }
    
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .brand-info h1 {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 0;
    }
    
    .brand-info p {
      font-size: 11px;
      opacity: 0.9;
    }
    
    .invoice-title {
      text-align: left;
    }
    
    .invoice-title h2 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    
    .invoice-title .order-number {
      font-size: 11px;
      opacity: 0.9;
      font-weight: 500;
    }
    
    .status-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
      margin-top: 4px;
      background: ${statusColor};
      color: white;
    }
    
    .order-details {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 20px;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
    
    .order-detail-item {
      display: flex;
      gap: 4px;
      font-size: 11px;
    }
    
    .order-detail-item .detail-label {
      opacity: 0.8;
    }
    
    .order-detail-item .detail-value {
      font-weight: 600;
    }
    
    .content {
      padding: 16px;
    }
    
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .info-card {
      background: #f9fafb;
      border-radius: 6px;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
    }
    
    .info-card h3 {
      font-size: 12px;
      font-weight: 600;
      color: #1a3c69;
      margin-bottom: 6px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .info-label {
      color: #6b7280;
      font-size: 11px;
    }
    
    .info-value {
      font-weight: 500;
      color: #1f2937;
      font-size: 11px;
    }
    
    .items-section {
      margin-bottom: 10px;
    }
    
    .items-section h3 {
      font-size: 13px;
      font-weight: 600;
      color: #1a3c69;
      margin-bottom: 8px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    
    thead {
      background: #1a3c69;
      color: white;
    }
    
    th {
      padding: 6px 6px;
      text-align: right;
      font-weight: 600;
      font-size: 11px;
    }
    
    th:nth-child(1) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: center; }
    th:nth-child(5), th:nth-child(6) { text-align: left; }
    
    tbody tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .totals-section {
      background: #f9fafb;
      border-radius: 6px;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .total-row:last-child {
      border-bottom: none;
      padding-top: 8px;
      margin-top: 4px;
      border-top: 2px solid #1a3c69;
    }
    
    .total-label {
      color: #6b7280;
      font-size: 12px;
    }
    
    .total-value {
      font-weight: 600;
      color: #1f2937;
      font-size: 12px;
    }
    
    .total-row:last-child .total-label {
      font-size: 14px;
      font-weight: 700;
      color: #1a3c69;
    }
    
    .total-row:last-child .total-value {
      font-size: 16px;
      font-weight: 700;
      color: #1a3c69;
    }
    
    .footer {
      background: #f9fafb;
      padding: 10px 16px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer p {
      color: #6b7280;
      font-size: 10px;
      margin-bottom: 2px;
    }
    
    .footer .thanks {
      color: #1a3c69;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .invoice {
        box-shadow: none;
        border-radius: 0;
      }
      
      @page {
        margin: 0.5cm;
        size: A5 portrait;
      }
    }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="header-content">
        <div class="logo-section">
          <div class="logo">
            <img src="/images/Logo/BlueXTransparent.png" alt="Voxcina Logo">
          </div>
          <div class="brand-info">
            <h1>وکسینا</h1>
            <p>فروشگاه آنلاین پوشاک</p>
          </div>
        </div>
        <div class="invoice-title">
          <h2>فاکتور فروش</h2>
          <div class="order-number">شماره سفارش: ${order.order_number}</div>
          <div class="status-badge">${order.status_text}</div>
        </div>
      </div>
      
      <div class="order-details">
        <div class="order-detail-item">
          <span class="detail-label">تاریخ ثبت:</span>
          <span class="detail-value">${order.jalali_created_at || order.created_at}</span>
        </div>
        <div class="order-detail-item">
          <span class="detail-label">وضعیت پرداخت:</span>
          <span class="detail-value">${order.payment_status === 'paid' ? 'پرداخت شده' : order.payment_status === 'pending' ? 'در انتظار پرداخت' : order.payment_status === 'failed' ? 'ناموفق' : order.payment_status === 'refunded' ? 'مسترد شده' : order.payment_status === 'cancelled' ? 'لغو شده' : order.payment_status}</span>
        </div>
        ${order.tracking_code ? `
        <div class="order-detail-item">
          <span class="detail-label">کد رهگیری:</span>
          <span class="detail-value">${order.tracking_code}</span>
        </div>
        ` : ''}
        ${order.discount_code ? `
        <div class="order-detail-item">
          <span class="detail-label">کد تخفیف:</span>
          <span class="detail-value">${order.discount_code}</span>
        </div>
        ` : ''}
      </div>
    </div>
    
    <div class="content">
      <div class="info-grid">
        
        
        <div class="info-card">
          <h3>آدرس تحویل</h3>
          <div class="info-row">
            <span class="info-label">نام:</span>
            <span class="info-value">${order.shipping_address.first_name || ''} ${order.shipping_address.last_name || ''}</span>
          </div>
          <div class="info-row">
            <span class="info-label">شماره تماس:</span>
            <span class="info-value">${order.shipping_address.phone_number || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">استان:</span>
            <span class="info-value">${order.shipping_address.province || order.shipping_address.state || '-'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">آدرس:</span>
            <span class="info-value" style="max-width: 200px; text-align: left;">${order.shipping_address.address || order.shipping_address.street || '-'}</span>
          </div>
          ${order.shipping_address.postal_code ? `
          <div class="info-row">
            <span class="info-label">کد پستی:</span>
            <span class="info-value">${order.shipping_address.postal_code}</span>
          </div>
          ` : ''}
        </div>
      </div>
      
      <div class="items-section">
        <h3>اقلام سفارش</h3>
        <table>
          <thead>
            <tr>
              <th>ردیف</th>
              <th>نام محصول</th>
              <th>سایز / رنگ</th>
              <th>تعداد</th>
              <th>قیمت واحد</th>
              <th>جمع کل</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
      </div>
      
      <div class="totals-section">
        <div class="total-row">
          <span class="total-label">جمع اقلام:</span>
          <span class="total-value">${formatPrice(itemsTotal)}</span>
        </div>
        ${shippingCost > 0 ? `
        <div class="total-row">
          <span class="total-label">هزینه ارسال:</span>
          <span class="total-value">${formatPrice(shippingCost)}</span>
        </div>
        ` : ''}
        ${discount > 0 ? `
        <div class="total-row">
          <span class="total-label">تخفیف:</span>
          <span class="total-value" style="color: #10b981;">- ${formatPrice(discount)}</span>
        </div>
        ` : ''}
        <div class="total-row">
          <span class="total-label">مبلغ قابل پرداخت:</span>
          <span class="total-value">${formatPrice(total)}</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div style="border-top: 2px solid #1a3c69; padding-top: 8px; margin-bottom: 6px;">
        <p style="font-size: 11px; font-weight: 700; color: #1a3c69; margin-bottom: 4px;">وکسینا — فروشگاه آنلاین پوشاک</p>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; font-size: 10px; color: #4b5563;">
          <span>📍 تهران، پاسداران، بوستان پنجم، کوی گلشن، پلاک ۱۴</span>
          <span>📞 ۰۲۱-۲۲۳۲۵۶۵۳</span>
          <span>✉️ info@voxcina.com</span>
          <span>🌐 voxcina.com</span>
        </div>
      </div>
      <p class="thanks">از خرید شما متشکریم!</p>
      <p>فاکتور الکترونیکی معتبر</p>
    </div>
  </div>
</body>
</html>
  `;
}
