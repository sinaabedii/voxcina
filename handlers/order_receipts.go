package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"backEnd/db"
	"backEnd/models"
	"backEnd/utils"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Receipt DTOs deliberately allowlist display fields. Never embed an Order,
// Address, or live Product here: receipts are shared by customers and admins.
type orderReceiptProduct struct {
	ID    primitive.ObjectID `json:"id"`
	Name  string             `json:"name"`
	Image string             `json:"image"`
}

type orderReceiptItem struct {
	Product         orderReceiptProduct `json:"product"`
	Variant         models.OrderVariant `json:"variant"`
	Quantity        int                 `json:"quantity"`
	PriceAtPurchase float64             `json:"price_at_purchase"`
}

type orderReceiptAddress struct {
	Title       string `json:"title"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	PhoneNumber string `json:"phone_number"`
	Province    string `json:"province"`
	Address     string `json:"address"`
	PostalCode  string `json:"postal_code"`
	Street      string `json:"street"`
	City        string `json:"city"`
	State       string `json:"state"`
	Country     string `json:"country"`
}

type orderReceiptResponse struct {
	ID              primitive.ObjectID  `json:"id"`
	OrderNumber     string              `json:"order_number"`
	Items           []orderReceiptItem  `json:"items"`
	TotalAmount     float64             `json:"total_amount"`
	ShippingCost    float64             `json:"shipping_cost"`
	TaxAmount       float64             `json:"tax_amount"`
	DiscountAmount  float64             `json:"discount_amount"`
	ShippingAddress orderReceiptAddress `json:"shipping_address"`
	Status          string              `json:"status"`
	StatusText      string              `json:"status_text"`
	TrackingCode    *string             `json:"tracking_code"`
	PaymentStatus   string              `json:"payment_status"`
	PaymentMethod   string              `json:"payment_method"`
	GatewayName     string              `json:"gateway_name"`
	CreatedAt       time.Time           `json:"created_at"`
	JalaliCreatedAt string              `json:"jalali_created_at"`
}

// newOrderReceiptResponse uses persisted purchase snapshots only, including
// when the referenced product or user has since been deleted.
func newOrderReceiptResponse(order models.Order) orderReceiptResponse {
	items := make([]orderReceiptItem, 0, len(order.Items))
	for _, item := range order.Items {
		name := item.ProductName
		if strings.TrimSpace(name) == "" {
			name = "کالا"
		}
		items = append(items, orderReceiptItem{
			Product: orderReceiptProduct{ID: item.ProductID, Name: name, Image: item.ProductImage},
			Variant: item.Variant, Quantity: item.Quantity, PriceAtPurchase: item.PriceAtPurchase,
		})
	}
	address := order.ShippingAddress
	return orderReceiptResponse{
		ID: order.ID, OrderNumber: order.OrderNumber, Items: items,
		TotalAmount: order.TotalAmount, ShippingCost: order.ShippingCost,
		TaxAmount: order.TaxAmount, DiscountAmount: order.DiscountAmount,
		ShippingAddress: orderReceiptAddress{
			Title: address.Title, FirstName: address.FirstName, LastName: address.LastName,
			PhoneNumber: address.PhoneNumber, Province: address.Province, Address: address.Address,
			PostalCode: address.PostalCode, Street: address.Street, City: address.City,
			State: address.State, Country: address.Country,
		},
		Status: order.Status, StatusText: getStatusText(order.Status), TrackingCode: order.TrackingCode,
		PaymentStatus: order.PaymentStatus, PaymentMethod: order.PaymentMethod,
		GatewayName: order.GatewayName, CreatedAt: order.CreatedAt,
		JalaliCreatedAt: order.GetJalaliCreatedAt(),
	}
}

func ownsOrderReceipt(order models.Order, userID primitive.ObjectID) bool {
	return !userID.IsZero() && order.UserID == userID
}

func orderReceiptFilter(orderID primitive.ObjectID, admin bool) bson.M {
	filter := bson.M{"_id": orderID}
	if !admin {
		filter["is_active"] = true
	}
	return filter
}

// GetOrderReceipt requires ownership even if the authenticated caller is an
// admin; arbitrary-order access belongs to the separate admin route.
func GetOrderReceipt(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("userID").(primitive.ObjectID)
	role, roleOK := r.Context().Value("role").(string)
	if !ok || userID.IsZero() || !roleOK || role == "" {
		utils.ErrorResponse(w, http.StatusUnauthorized, "Invalid authentication context")
		return
	}
	serveOrderReceipt(w, r, userID, false)
}

// GetAdminOrderReceipt is gated by AdminAuthMiddleware and, like
// GetAdminOrderById, includes inactive orders.
func GetAdminOrderReceipt(w http.ResponseWriter, r *http.Request) {
	serveOrderReceipt(w, r, primitive.NilObjectID, true)
}

func serveOrderReceipt(w http.ResponseWriter, r *http.Request, userID primitive.ObjectID, admin bool) {
	orderIDStr, ok := mux.Vars(r)["orderId"]
	if !ok {
		utils.ErrorResponse(w, http.StatusBadRequest, "Order ID not provided in path")
		return
	}
	orderID, err := primitive.ObjectIDFromHex(orderIDStr)
	if err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid order ID format in path")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	var order models.Order
	if err := db.Database.Collection("orders").FindOne(ctx, orderReceiptFilter(orderID, admin)).Decode(&order); err != nil {
		if err == mongo.ErrNoDocuments {
			message := "Active order not found"
			if admin {
				message = "Order not found"
			}
			utils.ErrorResponse(w, http.StatusNotFound, message)
		} else {
			utils.ErrorResponse(w, http.StatusInternalServerError, "Error fetching order: "+err.Error())
		}
		return
	}
	if !admin && !ownsOrderReceipt(order, userID) {
		utils.ErrorResponse(w, http.StatusForbidden, "You are not authorized to view this order")
		return
	}
	utils.JSONResponse(w, http.StatusOK, newOrderReceiptResponse(order))
}
