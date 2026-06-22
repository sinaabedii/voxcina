# Payment Integration Guide

## Quick Start

### 1. Backend Setup

The Zibal payment service is already initialized in `main.go`. No additional setup required.

### 2. Environment Configuration

Add to your `.env` file:

```env
ZIBAL_MERCHANT=zibal
APP_URL=http://localhost:3000
```

For production:
```env
ZIBAL_MERCHANT=your-production-merchant-id
APP_URL=https://yourdomain.com
```

### 3. Frontend Integration

#### Using the Payment Hook

```tsx
import { usePayment } from "@/hooks/usePayment";

function CheckoutPage() {
  const { requestPayment, verifyPayment, isLoading, error } = usePayment();

  const handlePayment = async (orderId: string, amount: number) => {
    const response = await requestPayment(
      orderId,
      amount,
      "Order description",
      userPhone
    );

    if (response?.payUrl) {
      window.location.href = response.payUrl;
    }
  };

  return (
    <button onClick={() => handlePayment(orderId, totalAmount)}>
      Pay Now
    </button>
  );
}
```

#### Using the Payment Component

```tsx
import ZibalPayment from "@/components/checkout/ZibalPayment";

function CheckoutPage() {
  return (
    <ZibalPayment
      orderId={orderId}
      amount={totalAmount}
      description="Order description"
      mobile={userPhone}
      onPaymentSuccess={(trackId, refNumber) => {
        console.log("Payment successful", trackId, refNumber);
        router.push("/checkout/success");
      }}
      onPaymentError={(error) => {
        console.error("Payment failed", error);
      }}
    />
  );
}
```

### 4. API Endpoints

All endpoints are available at `/api/payment/*`:

- **POST /api/payment/request** - Initiate payment
- **POST /api/payment/verify** - Verify payment status
- **POST /api/payment/inquiry** - Check payment details
- **GET /api/payment/callback** - Zibal callback (automatic)

### 5. Testing

#### Test with Zibal Test Merchant

```env
ZIBAL_MERCHANT=zibal
```

#### Test Card Details
- Card: 6221061113530007
- CVV: 123
- Expiry: 12/26

#### Test Flow

1. Create an order
2. Call payment request endpoint
3. Redirect to Zibal gateway
4. Use test card to complete payment
5. Verify payment status

### 6. Order Status Flow

```
Order Created (pending)
  ↓
Payment Requested (payment_status: pending)
  ↓
Payment Completed (payment_status: paid, status: processing)
  ↓
Order Processing (status: processing)
  ↓
Order Shipped (status: shipped)
  ↓
Order Delivered (status: delivered)
```

## Integration Points

### 1. Checkout Page

The checkout page should:
- Create order via `/api/checkout`
- Call `/api/payment/request` with order ID
- Redirect to payment URL
- Handle callback redirect

### 2. Order Details Page

The order details page should:
- Display payment status
- Show reference number if paid
- Allow payment retry if failed
- Show payment history

### 3. Order Confirmation Email

Include:
- Order number
- Payment status
- Reference number
- Tracking information

## Database Schema

### Order Collection Updates

```javascript
{
  _id: ObjectId,
  order_number: "DGS-00001",
  payment_method: "online",
  payment_status: "paid",
  zibal_track_id: 123456,
  zibal_ref_number: "ref-123456",
  paid_at: ISODate("2024-12-10T12:05:00Z"),
  // ... other fields
}
```

## Error Handling

### Common Scenarios

**Payment Request Fails**
- Check merchant ID is correct
- Verify amount >= 1000 Rials
- Ensure order exists and belongs to user

**Callback Not Received**
- Check APP_URL is publicly accessible
- Verify callback URL in Zibal dashboard
- Check server logs

**Payment Verification Fails**
- Ensure trackId is correct
- Verify user owns the order
- Check Zibal transaction status

## Security Best Practices

1. **Always verify payment** - Call `/api/payment/verify` before marking order as paid
2. **Validate user ownership** - Ensure user owns the order before processing
3. **Use HTTPS** - All payment communication must be encrypted
4. **Secure callback** - Validate trackId and orderId in callback
5. **Log transactions** - Keep detailed logs for audit trail
6. **Handle errors gracefully** - Never expose sensitive information in errors

## Monitoring & Logging

### Key Metrics to Monitor

- Payment request success rate
- Payment verification success rate
- Callback processing time
- Failed payment reasons
- Average transaction amount

### Logs to Check

```bash
# Backend logs
docker compose logs -f server

# Payment-related logs
grep "payment" server.log
grep "zibal" server.log
```

## Troubleshooting

### Payment Request Returns "merchant not found"

**Solution:**
```bash
# Check environment variable
echo $ZIBAL_MERCHANT

# Should output your merchant ID or "zibal" for testing
```

### Callback Not Received

**Solution:**
1. Check APP_URL is publicly accessible
2. Verify callback URL in Zibal dashboard matches `{APP_URL}/api/payment/callback`
3. Check firewall allows incoming requests
4. Review server logs for incoming requests

### Payment Shows "Unverified"

**Solution:**
```bash
# Call verify endpoint to confirm payment
curl -X POST http://localhost:8080/api/payment/verify \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"trackId": 123456}'
```

## Next Steps

1. **Test Payment Flow**
   - Create test order
   - Complete test payment
   - Verify order status updated

2. **Integrate with Checkout**
   - Add payment component to checkout page
   - Handle success/error states
   - Update order status display

3. **Add Order Tracking**
   - Display payment status in order details
   - Show reference number
   - Allow payment retry

4. **Setup Monitoring**
   - Monitor payment success rates
   - Alert on failures
   - Track transaction metrics

5. **Production Deployment**
   - Register production merchant account
   - Update merchant ID
   - Test end-to-end
   - Deploy with monitoring

## Support

For issues or questions:
1. Check README.md Zibal section
2. Review ZIBAL_INTEGRATION.md
3. Check server logs
4. Contact Zibal support: https://zibal.ir
