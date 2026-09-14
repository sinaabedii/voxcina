package services

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"backEnd/models"
)

// Notification copy.
//
// Precedence for the {title, body} of an event-driven notification:
//
//  1. DB notification_templates — admin edits, effective immediately (30s cache)
//  2. config/notification_templates.json — externalised copy, changeable
//     without a rebuild (same loading pattern as config/ai_prompts.json)
//  3. built-in defaults — the compiled-in fallback so a missing file or a
//     fresh database degrades to correct Persian copy rather than silence
//
// Placeholders are {{field}} tokens replaced from the render data. An unknown
// placeholder renders as an empty string; an unknown template type renders the
// admin-supplied copy verbatim (campaigns carry their own copy and skip
// rendering entirely).

const notificationTemplatesPath = "config/notification_templates.json"

// NotificationCopy is one rendered or templated notification's copy.
type NotificationCopy struct {
	Title string
	Body  string
}

// notificationTemplate is one entry of the config file / DB override.
type notificationTemplate struct {
	Enabled bool   `json:"enabled"`
	Title   string `json:"title"`
	Body    string `json:"body"`
}

// builtinNotificationCopy is the last-resort copy — what the config file was
// seeded with. A deployment whose config file is lost still sends Persian copy.
var builtinNotificationCopy = map[string]notificationTemplate{
	models.NotificationTypeOrderPlaced: {Enabled: true, Title: "سفارش شما ثبت شد",
		Body: "سفارش {{order_number}} با موفقیت ثبت شد. پس از پرداخت، آماده‌سازی آن آغاز می‌شود."},
	models.NotificationTypeOrderStatus: {Enabled: true, Title: "وضعیت سفارش تغییر کرد",
		Body: "سفارش {{order_number}} اکنون در وضعیت {{status}} است."},
	models.NotificationTypePaymentSucceeded: {Enabled: true, Title: "پرداخت موفق",
		Body: "پرداخت سفارش {{order_number}} با موفقیت انجام شد. هم‌اکنون می‌توانید آن را پیگیری کنید."},
	models.NotificationTypePaymentFailed: {Enabled: true, Title: "پرداخت ناموفق",
		Body: "پرداخت سفارش {{order_number}} ناتمام ماند. در صورت کسر وجه، مبلغ تا ۷۲ ساعت آینده بازمی‌گردد."},
	models.NotificationTypeReturnDecided: {Enabled: true, Title: "نتیجه درخواست مرجوعی",
		Body: "درخواست مرجوعی سفارش {{order_number}} {{decision}} شد."},
	models.NotificationTypeTicketReplied: {Enabled: true, Title: "پاسخ پشتیبانی",
		Body: "پشتیبانی به تیکت {{ticket_number}} پاسخ داد."},
	models.NotificationTypeTryonReply: {Enabled: true, Title: "پاسخ ووکسا در اتاق پرو",
		Body: "ووکسا پاسخ جدیدی برای شما در اتاق پرو نوشت."},
	models.NotificationTypeVoucherGranted: {Enabled: true, Title: "کد تخفیف برای شما",
		Body: "کد تخفیف {{code}} برای شما فعال شد؛ تا {{valid_until}} اعتبار دارد."},
	models.NotificationTypeVoucherExpiring: {Enabled: true, Title: "کد تخفیف شما به‌زودی منقضی می‌شود",
		Body: "کد تخفیف {{code}} تا پایان {{valid_until}} اعتبار دارد. از آن استفاده کنید."},
	models.NotificationTypeCouponOffer: {Enabled: true, Title: "پیشنهاد ویژه برای سبد خرید شما",
		Body: "کد تخفیف {{code}} برای سبد خرید شما فعال شد؛ تا {{valid_until}} اعتبار دارد."},
	models.NotificationTypeCartReminder: {Enabled: true, Title: "سبد خرید شما منتظر است",
		Body: "سبد خرید شما هنوز کامل نشده است. هر وقت آماده بودید، ادامه بدهید."},
	models.NotificationTypePriceDrop: {Enabled: true, Title: "کاهش قیمت",
		Body: "قیمت {{product_name}} کاهش یافت."},
	models.NotificationTypeBackInStock: {Enabled: true, Title: "موجود شد",
		Body: "{{product_name}} دوباره موجود شد."},
}

var placeholderPattern = regexp.MustCompile(`\{\{[a-z_]+\}\}`)

// RenderNotificationCopy replaces every {{field}} with data[field], trimming
// unknown placeholders to empty. Exposed for tests and the admin preview.
func RenderNotificationCopy(tpl string, data map[string]string) string {
	return placeholderPattern.ReplaceAllStringFunc(tpl, func(match string) string {
		return data[strings.Trim(match, "{}")]
	})
}

// fileNotificationTemplates decodes config/notification_templates.json once.
var (
	fileTemplatesOnce sync.Once
	fileTemplatesMap  map[string]notificationTemplate
)

func fileNotificationTemplates() map[string]notificationTemplate {
	fileTemplatesOnce.Do(func() {
		raw, err := os.ReadFile(notificationTemplatesPath)
		if err != nil {
			if !os.IsNotExist(err) {
				log.Printf("notification templates: reading %s failed: %v", notificationTemplatesPath, err)
			}
			return
		}
		var doc struct {
			Templates map[string]notificationTemplate `json:"notification_templates"`
		}
		if err := json.Unmarshal(raw, &doc); err != nil {
			log.Printf("notification templates: %s is malformed: %v", notificationTemplatesPath, err)
			return
		}
		fileTemplatesMap = doc.Templates
	})
	return fileTemplatesMap
}

// dbNotificationOverride loads one type's admin override from
// notification_templates, with a short-lived cache so hot paths do not hit
// Mongo for every event. On a DB error the override is simply absent.
var (
	dbTemplateCacheMu sync.RWMutex
	dbTemplateCache   = map[string]dbTemplateEntry{}
)

type dbTemplateEntry struct {
	tpl      *notificationTemplate
	loadedAt time.Time
}

const dbTemplateCacheTTL = 30 * time.Second

func dbNotificationOverride(ctx context.Context, database *mongo.Database, notificationType string) *notificationTemplate {
	if database == nil {
		return nil
	}
	dbTemplateCacheMu.RLock()
	entry, ok := dbTemplateCache[notificationType]
	dbTemplateCacheMu.RUnlock()
	if ok && time.Since(entry.loadedAt) < dbTemplateCacheTTL {
		return entry.tpl
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var doc models.NotificationTemplate
	err := database.Collection("notification_templates").FindOne(ctx, bson.M{"type": notificationType}).Decode(&doc)
	var tpl *notificationTemplate
	if err == nil {
		tpl = &notificationTemplate{Enabled: doc.Enabled, Title: doc.Title, Body: doc.Body}
	} else if err != mongo.ErrNoDocuments {
		log.Printf("notification templates: loading override for %s failed: %v", notificationType, err)
	}
	dbTemplateCacheMu.Lock()
	dbTemplateCache[notificationType] = dbTemplateEntry{tpl: tpl, loadedAt: time.Now()}
	dbTemplateCacheMu.Unlock()
	return tpl
}

// ResolveNotificationCopy decides the copy for a notification type and whether
// it is enabled at all. A disabled template mutes the event entirely — neither
// an inbox row nor a push is produced.
func ResolveNotificationCopy(
	ctx context.Context,
	database *mongo.Database,
	notificationType string,
	data map[string]string,
) (NotificationCopy, bool) {
	if override := dbNotificationOverride(ctx, database, notificationType); override != nil {
		if !override.Enabled {
			return NotificationCopy{}, false
		}
		return NotificationCopy{
			Title: RenderNotificationCopy(override.Title, data),
			Body:  RenderNotificationCopy(override.Body, data),
		}, true
	}
	if file := fileNotificationTemplates(); file != nil {
		if tpl, ok := file[notificationType]; ok {
			if !tpl.Enabled {
				return NotificationCopy{}, false
			}
			return NotificationCopy{
				Title: RenderNotificationCopy(tpl.Title, data),
				Body:  RenderNotificationCopy(tpl.Body, data),
			}, true
		}
	}
	builtin := builtinNotificationCopy[notificationType]
	return NotificationCopy{
		Title: RenderNotificationCopy(builtin.Title, data),
		Body:  RenderNotificationCopy(builtin.Body, data),
	}, builtin.Enabled
}
