# Zibal Payment Gateway Integration

## Implementation Summary

This document outlines the complete Zibal payment gateway integration for the Voxcina e-commerce platform.

## Files Created/Modified

### Backend (Go)

#### New Files
- **`services/zibal_service.go`** - Zibal API client service
  - `ZibalService` struct for managing payment operations
  - Methods: `RequestPayment()`, `VerifyPayment()`, `InquiryPayment()`
  - Helper functions for payment status mapping
  - Type definitions for Zibal API requests/responses

- **`handlers/payment.go`** - HTTP handlers for payment operations
  - `RequestPayment()` - Initiate payment request
  - `PaymentCallback()` - Handle Zibal callback
  - `VerifyPayment()` - Verify payment status
  - `InquiryPayment()` - Inquiry payment details
  - `InitZibalService()` - Initialize service with merchant ID

#### Modified Files
- **`models/order.go`** - Added payment tracking fields
  - `PaymentMethod` - Payment method selection
  - `ZibalTrackID` - Zibal transaction tracking ID
  - `ZibalRefNumber` - Zibal reference number
  - `PaidAt` - Payment completion timestamp

- **`routes/routes.go`** - Added payment endpoints
  - `POST /api/payment/request` - Request payment (auth required)
  - `POST /api/payment/verify` - Verify payment (auth required)
  - `POST /api/payment/inquiry` - Inquiry payment (auth required)
  - `GET /api/payment/callback` - Payment callback (public)

- **`main.go`** - Initialize Zibal service on startup
  - `handlers.InitZibalService()` call

### Frontend (React/Next.js)

#### New Files
- **`src/hooks/usePayment.ts`** - Payment hook
  - `usePayment()` hook for payment operations
  - Methods: `requestPayment()`, `verifyPayment()`, `inquiryPayment()`
  - Error handling and loading states
  - Toast notifications

- **`src/components/checkout/ZibalPayment.tsx`** - Payment component
  - `ZibalPayment` component for checkout integration
  - Payment flow UI with status indicators
  - Loading states and error handling
  - Callback URL detection and verification

### Configuration

#### Modified Files
- **`.env.example`** - Added Zibal configuration
  - `ZIBAL_MERCHANT` - Merchant ID (test: "zibal")

- **`README.md`** - Comprehensive Zibal documentation
  - Setup instructions
  - Payment flow explanation
  - API endpoint documentation
  - Testing guide
  - Production checklist
  - Troubleshooting guide

## Architecture

### Payment Flow

```
1. User initiates checkout
   ↓
2. Frontend calls POST /api/payment/request
   ↓
3. Backend creates Zibal payment request
   ↓
4. Zibal returns trackId
   ↓
5. Frontend redirects to https://gateway.zibal.ir/start/{trackId}
   ↓
6. User completes payment on Zibal gateway
   ↓
7. Zibal sends callback to GET /api/payment/callback
   ↓
8. Backend updates order status
   ↓
9. Frontend verifies payment with POST /api/payment/verify
   ↓
10. Order marked as paid and processing begins
```

### Data Flow

**Request Payment:**
```
Frontend → POST /api/payment/request
  {orderId, amount, description, mobile}
  ↓
Backend validates order and user
  ↓
Zibal API → POST /v1/request
  ↓
Zibal returns {trackId, result}
  ↓
Backend stores trackId in order
  ↓
Frontend → {trackId, payUrl}
```

**Payment Callback:**
```
Zibal → GET /api/payment/callback
  {success, trackId, orderId, status}
  ↓
Backend finds order by trackId
  ↓
Updates order status based on success flag
  ↓
Returns 200 OK to Zibal
```

**Verify Payment:**
```
Frontend → POST /api/payment/verify
  {trackId}
  ↓
Backend validates user owns order
  ↓
Zibal API → POST /v1/verify
  ↓
Zibal returns payment details
  ↓
Backend updates order with ref number
  ↓
Frontend → {paymentStatus, statusText, refNumber}
```

## API Endpoints

### Request Payment
```
POST /api/payment/request
Authorization: Bearer {jwt_token}

Request:
{
  "orderId": "order-id",
  "amount": 1000000,
  "description": "Order description",
  "mobile": "09xxxxxxxxx"
}

Response (Success):
{
  "result": 100,
  "message": "Payment request created successfully",
  "trackId": 123456,
  "payUrl": "https://gateway.zibal.ir/start/123456"
}

Response (Error):
{
  "result": 102,
  "message": "merchant not found"
}
```

### Payment Callback
```
GET /api/payment/callback?success=1&trackId=123456&orderId=order-id&status=1

Sent by Zibal automatically after payment
No authentication required
Updates order status in database
```

### Verify Payment
```
POST /api/payment/verify
Authorization: Bearer {jwt_token}

Request:
{
  "trackId": 123456
}

Response (Success):
{
  "result": 100,
  "message": "Payment verified",
  "status": 1,
  "amount": 1000000,
  "refNumber": "ref-123456",
  "cardNumber": "****-****-****-1234",
  "paidAt": "2024-12-10T12:05:00Z",
  "paymentStatus": "paid",
  "statusText": "پرداخت شده - تاییدشده"
}
```

### Inquiry Payment
```
POST /api/payment/inquiry
Authorization: Bearer {jwt_token}

Request:
{
  "trackId": 123456
}

Response:
{
  "result": 100,
  "message": "Payment inquiry successful",
  "status": 1,
  "amount": 1000000,
  "refNumber": "ref-123456",
  "cardNumber": "****-****-****-1234",
  "createdAt": "2024-12-10T12:00:00Z",
  "paidAt": "2024-12-10T12:05:00Z",
  "verifiedAt": "2024-12-10T12:05:30Z",
  "paymentStatus": "paid",
  "statusText": "پرداخت شده - تاییدشده"
}
```

## Configuration

### Environment Variables

```env
# Zibal Merchant ID
ZIBAL_MERCHANT=zibal

# Application URL (must be HTTPS in production)
APP_URL=https://yourdomain.com
```

### Zibal Setup

1. Register at https://zibal.ir
2. Create merchant account
3. Get merchant ID from dashboard
4. Configure callback URL: `{APP_URL}/api/payment/callback`
5. For testing, use merchant ID: `zibal`

## Testing

### Test Merchant
```
ZIBAL_MERCHANT=zibal
```

### Test Card
- Card Number: 6221061113530007
- CVV: 123
- Expiry: 12/26

### Test Flow
1. Create order via `/api/checkout`
2. Call `/api/payment/request` with order ID
3. Redirect to payment URL
4. Complete payment on Zibal test gateway
5. Verify payment with `/api/payment/verify`
6. Check order status updated to "processing"

## Security Considerations

- All payment endpoints require JWT authentication (except callback)
- Callback validation checks trackId and orderId match
- Payment verification confirms user owns order
- Card details never stored locally
- All communication with Zibal uses HTTPS
- Sensitive data (ref numbers) stored encrypted in database

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| merchant not found | Invalid merchant ID | Verify ZIBAL_MERCHANT env var |
| merchant inactive | Account not activated | Contact Zibal support |
| invalid amount | Amount < 1000 Rials | Ensure minimum amount |
| invalid callback URL | URL doesn't start with http/https | Check APP_URL format |
| IP not registered | Server IP not whitelisted | Register IP in Zibal dashboard |

### Logging

All payment operations are logged with:
- Request/response details
- Error messages
- Timestamps
- User IDs
- Order IDs

## Production Deployment

### Pre-Deployment Checklist

- [ ] Register production merchant account with Zibal
- [ ] Update `ZIBAL_MERCHANT` with production ID
- [ ] Ensure `APP_URL` is HTTPS
- [ ] Configure callback URL in Zibal dashboard
- [ ] Test payment flow end-to-end
- [ ] Set up error monitoring and alerting
- [ ] Configure email notifications for payment failures
- [ ] Test refund process
- [ ] Set up payment reconciliation job
- [ ] Document support procedures

### Monitoring

Monitor these metrics:
- Payment request success rate
- Payment verification success rate
- Callback processing time
- Failed payment reasons
- Average transaction amount
- Daily transaction volume

## Maintenance

### Regular Tasks

- Monitor payment success rates
- Review failed transactions
- Test payment flow monthly
- Update Zibal API if new versions released
- Review and optimize error handling

### Troubleshooting

**Payment request fails with "merchant not found"**
- Verify `ZIBAL_MERCHANT` environment variable is set correctly
- Check merchant ID matches Zibal dashboard

**Callback not received**
- Ensure `APP_URL` is publicly accessible
- Check firewall allows incoming requests from Zibal
- Verify callback URL in Zibal dashboard
- Check server logs for callback requests

**Payment status shows "unverified"**
- Call `/api/payment/verify` endpoint to confirm
- Check order status in database
- Review Zibal transaction details

**Card declined errors**
- Check test card details if in test mode
- Verify amount is valid (>= 1000 Rials)
- Check daily/monthly limits not exceeded

## Future Enhancements

- [ ] Implement refund functionality
- [ ] Add payment reconciliation job
- [ ] Support multiple payment methods
- [ ] Implement payment retry logic
- [ ] Add payment analytics dashboard
- [ ] Support subscription payments
- [ ] Implement fraud detection
- [ ] Add payment webhooks for external systems

## References

- Zibal API Documentation: https://zibal.ir
- Zibal Test Merchant: zibal
- Payment Status Codes: See README.md
