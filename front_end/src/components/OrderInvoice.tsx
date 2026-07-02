import { Order } from "@/types/order";
import { formatPrice } from "@/lib/utils";

interface OrderInvoiceProps {
  order: Order;
}

export function downloadInvoice(order: Order) {
  const invoiceHTML = generateInvoiceHTML(order);
  
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

function generateInvoiceHTML(order: Order): string {
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
      <td style="padding: 12px; text-align: center; color: #6b7280;">${idx + 1}</td>
      <td style="padding: 12px; font-weight: 500; color: #1f2937;">${item.product.name}</td>
      <td style="padding: 12px; text-align: center; color: #6b7280;">
        ${item.variant.size} ${item.variant.colorName ? `- ${item.variant.colorName}` : ''}
      </td>
      <td style="padding: 12px; text-align: center; color: #6b7280;">${item.quantity}</td>
      <td style="padding: 12px; text-align: left; color: #1f2937;">${formatPrice(item.price_at_purchase)}</td>
      <td style="padding: 12px; text-align: left; font-weight: 600; color: #1f2937;">
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
      padding: 20px;
      color: #1f2937;
      line-height: 1.6;
    }
    
    .invoice {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #1a3c69 0%, #2d5a9e 100%);
      color: white;
      padding: 40px;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
      animation: pulse 4s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.8; }
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
      gap: 20px;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      background: white;
      border-radius: 12px;
      padding: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .logo img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .brand-info h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    
    .brand-info p {
      font-size: 14px;
      opacity: 0.9;
    }
    
    .invoice-title {
      text-align: left;
    }
    
    .invoice-title h2 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .invoice-title .order-number {
      font-size: 16px;
      opacity: 0.9;
      font-weight: 500;
    }
    
    .status-badge {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 12px;
      background: ${statusColor};
      color: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    .content {
      padding: 40px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .info-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid #e5e7eb;
    }
    
    .info-card h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1a3c69;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .info-card h3::before {
      content: '';
      width: 4px;
      height: 20px;
      background: #1a3c69;
      border-radius: 2px;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .info-label {
      color: #6b7280;
      font-size: 14px;
    }
    
    .info-value {
      font-weight: 500;
      color: #1f2937;
      font-size: 14px;
    }
    
    .items-section {
      margin-bottom: 40px;
    }
    
    .items-section h3 {
      font-size: 18px;
      font-weight: 600;
      color: #1a3c69;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .items-section h3::before {
      content: '';
      width: 4px;
      height: 24px;
      background: #1a3c69;
      border-radius: 2px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    thead {
      background: #1a3c69;
      color: white;
    }
    
    th {
      padding: 16px 12px;
      text-align: right;
      font-weight: 600;
      font-size: 14px;
    }
    
    th:nth-child(1) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: center; }
    th:nth-child(5), th:nth-child(6) { text-align: left; }
    
    tbody tr:hover {
      background: #f9fafb;
    }
    
    .totals-section {
      background: #f9fafb;
      border-radius: 12px;
      padding: 24px;
      border: 1px solid #e5e7eb;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .total-row:last-child {
      border-bottom: none;
      padding-top: 16px;
      margin-top: 8px;
      border-top: 2px solid #1a3c69;
    }
    
    .total-label {
      color: #6b7280;
      font-size: 15px;
    }
    
    .total-value {
      font-weight: 600;
      color: #1f2937;
      font-size: 15px;
    }
    
    .total-row:last-child .total-label {
      font-size: 18px;
      font-weight: 700;
      color: #1a3c69;
    }
    
    .total-row:last-child .total-value {
      font-size: 20px;
      font-weight: 700;
      color: #1a3c69;
    }
    
    .footer {
      background: #f9fafb;
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    .footer p {
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 8px;
    }
    
    .footer .thanks {
      color: #1a3c69;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
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
        size: A4;
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
            <img src="/images/BlueXTransparent.png" alt="Voxcina Logo">
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
    </div>
    
    <div class="content">
      <div class="info-grid">
        <div class="info-card">
          <h3>اطلاعات فروشنده</h3>
          <div class="info-row">
            <span class="info-label">نام فروشگاه:</span>
            <span class="info-value">وکسینا</span>
          </div>
          <div class="info-row">
            <span class="info-label">آدرس:</span>
            <span class="info-value" style="max-width: 200px; text-align: left;">تهران، پاسداران، بوستان پنجم، کوی گلشن، پلاک ۱۴</span>
          </div>
          <div class="info-row">
            <span class="info-label">تلفن:</span>
            <span class="info-value">۰۲۱-۲۲۳۲۵۶۵۳</span>
          </div>
          <div class="info-row">
            <span class="info-label">ایمیل:</span>
            <span class="info-value">info@voxcina.com</span>
          </div>
          <div class="info-row">
            <span class="info-label">وب‌سایت:</span>
            <span class="info-value">voxcina.com</span>
          </div>
        </div>
        
        <div class="info-card">
          <h3>اطلاعات سفارش</h3>
          <div class="info-row">
            <span class="info-label">تاریخ ثبت:</span>
            <span class="info-value">${order.jalali_created_at || order.created_at}</span>
          </div>
          <div class="info-row">
            <span class="info-label">وضعیت پرداخت:</span>
            <span class="info-value">${order.payment_status === 'paid' ? 'پرداخت شده' : order.payment_status === 'pending' ? 'در انتظار' : order.payment_status}</span>
          </div>
          ${order.tracking_code ? `
          <div class="info-row">
            <span class="info-label">کد رهگیری:</span>
            <span class="info-value">${order.tracking_code}</span>
          </div>
          ` : ''}
          ${order.discount_code ? `
          <div class="info-row">
            <span class="info-label">کد تخفیف:</span>
            <span class="info-value">${order.discount_code}</span>
          </div>
          ` : ''}
        </div>
        
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
      <div style="border-top: 3px solid #1a3c69; padding-top: 24px; margin-bottom: 20px;">
        <p style="font-size: 16px; font-weight: 700; color: #1a3c69; margin-bottom: 16px;">وکسینا — فروشگاه آنلاین پوشاک</p>
        <div style="display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; font-size: 13px; color: #4b5563;">
          <span>📍 تهران، پاسداران، بوستان پنجم، کوی گلشن، پلاک ۱۴</span>
          <span>📞 ۰۲۱-۲۲۳۲۵۶۵۳</span>
          <span>✉️ info@voxcina.com</span>
          <span>🌐 voxcina.com</span>
        </div>
      </div>
      <p class="thanks">از خرید شما متشکریم!</p>
      <p>برای پیگیری سفارش یا ارتباط با پشتیبانی، به پنل کاربری خود مراجعه کنید.</p>
      <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">
        این فاکتور به صورت الکترونیکی صادر شده و معتبر می‌باشد.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
