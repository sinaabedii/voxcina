package models

import (
	"reflect"
	"strings"
	"testing"
)

func TestAddressNormalizeDigits(t *testing.T) {
	address := Address{
		PostalCode:  "۷۵۳۷۸۹۰۷۴۲",
		PhoneNumber: "٠٩١٢٣٤٥٦٧٨٩",
		Address:     "تهران، خیابان کارگر شمالی، پلاک ۱۲، طبقه ۳، واحد ۷ ",
		Street:      "خیابان ولیعصر ۲۲",
	}
	address.NormalizeDigits()

	if address.PostalCode != "7537890742" {
		t.Errorf("postal code: got %q", address.PostalCode)
	}
	if address.PhoneNumber != "09123456789" {
		t.Errorf("phone number: got %q", address.PhoneNumber)
	}
	// The typed suffix carries numbers too, and the trailing space goes with it.
	if want := "تهران، خیابان کارگر شمالی، پلاک 12، طبقه 3، واحد 7"; address.Address != want {
		t.Errorf("address: got %q, want %q", address.Address, want)
	}
	if address.Street != "خیابان ولیعصر 22" {
		t.Errorf("street: got %q", address.Street)
	}
}

func TestAddressNormalizeDigitsIsIdempotent(t *testing.T) {
	address := Address{PostalCode: "1439955975", PhoneNumber: "09149257695", Address: "تهران"}
	before := address
	address.NormalizeDigits()
	if address != before {
		t.Errorf("already-ASCII address was rewritten: %+v", address)
	}
}

func TestAddressNormalizeDigitsNilReceiver(t *testing.T) {
	var address *Address
	address.NormalizeDigits() // must not panic
}

// The migration walks AddressDigitFields while NormalizeDigits assigns struct
// fields, so the two can drift apart. Mark every string field, normalize, and
// require that exactly the listed fields changed.
func TestAddressDigitFieldsMatchNormalizeDigits(t *testing.T) {
	listed := make(map[string]bool, len(AddressDigitFields))
	for _, field := range AddressDigitFields {
		listed[field] = true
	}

	var address Address
	value := reflect.ValueOf(&address).Elem()
	for i := 0; i < value.NumField(); i++ {
		if value.Field(i).Kind() == reflect.String {
			value.Field(i).SetString("۱")
		}
	}

	marked := address
	address.NormalizeDigits()

	structType := value.Type()
	for i := 0; i < structType.NumField(); i++ {
		if value.Field(i).Kind() != reflect.String {
			continue
		}
		name := strings.Split(strings.TrimSpace(structType.Field(i).Tag.Get("bson")), ",")[0]
		changed := value.Field(i).String() != reflect.ValueOf(marked).Field(i).String()
		if changed != listed[name] {
			t.Errorf("field %q: normalized=%v, but AddressDigitFields lists it=%v", name, changed, listed[name])
		}
	}
}
