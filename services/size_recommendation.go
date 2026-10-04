package services

import (
	"fmt"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode"

	"backEnd/models"
	"backEnd/utils"
)

const SizeRecommendationEngineVersion = "hybrid-v1"

var measurementNumberRE = regexp.MustCompile(`^\s*([+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+))\s*([^\d\s]*)\s*$`)
var chartNumberRE = regexp.MustCompile(`(?:\d+(?:[.,]\d*)?|[.,]\d+)`)

var measurementAliases = map[string]string{
	"height": "height", "tall": "height", "قد": "height", "قدبدن": "height",
	"weight": "weight", "وزن": "weight",
	"chest": "chest", "bust": "chest", "chestcircumference": "chest", "دورسینه": "chest", "سینه": "chest",
	"waist": "waist", "waistcircumference": "waist", "دورکمر": "waist", "کمر": "waist",
	"hip": "hip", "hips": "hip", "hipcircumference": "hip", "دورباسن": "hip", "باسن": "hip",
	"shoulder": "shoulder", "shoulders": "shoulder", "سرشانه": "shoulder", "شانه": "shoulder",
	"sleeve": "sleeve", "sleevelength": "sleeve", "قدآستین": "sleeve", "آستین": "sleeve",
	"inseam": "inseam", "insideleg": "inseam", "insideleglength": "inseam", "داخلپا": "inseam", "فاق": "inseam",
	"length": "length", "bodylength": "length", "طول": "length",
}

// CanonicalMeasurementKey makes chart and questionnaire keys comparable while
// retaining unknown keys as empty. Unknown keys are deliberately not scored.
func CanonicalMeasurementKey(raw string) string {
	raw = strings.ToLower(utils.NormalizePersianDigits(strings.TrimSpace(raw)))
	var b strings.Builder
	for _, r := range raw {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	key := b.String()
	if value, ok := measurementAliases[key]; ok {
		return value
	}
	// Labels often contain a short descriptive prefix/suffix.
	for alias, value := range measurementAliases {
		if len([]rune(alias)) >= 3 && strings.Contains(key, alias) {
			return value
		}
	}
	return ""
}

// ParseMeasurementValue parses one questionnaire value. It accepts Latin,
// Persian and Arabic-Indic digits plus cm/kg, m and inch suffixes.
func ParseMeasurementValue(raw string, key string) (float64, error) {
	raw = utils.NormalizePersianDigits(strings.TrimSpace(raw))
	matches := measurementNumberRE.FindStringSubmatch(raw)
	if matches == nil {
		return 0, fmt.Errorf("measurement must be one finite positive number")
	}
	number, err := strconv.ParseFloat(strings.ReplaceAll(matches[1], ",", "."), 64)
	if err != nil || !finite(number) || number <= 0 {
		return 0, fmt.Errorf("measurement must be one finite positive number")
	}
	unit := strings.ToLower(matches[2])
	canonical := CanonicalMeasurementKey(key)
	unit = strings.ReplaceAll(unit, "\u200c", "")
	if strings.Contains(unit, "inch") || unit == "in" || unit == "\"" {
		if canonical == "weight" {
			return 0, fmt.Errorf("weight cannot use length units")
		}
		number *= 2.54
	} else if unit == "m" || unit == "meter" || unit == "metre" {
		if canonical == "weight" {
			return 0, fmt.Errorf("weight cannot use metres")
		}
		number *= 100
	} else if unit == "کیلو" || unit == "کیلوگرم" {
		if canonical != "weight" {
			return 0, fmt.Errorf("weight unit on non-weight measurement")
		}
	} else if unit == "سانتیمتر" || unit == "سانتی متر" || unit == "سانتی" {
		if canonical == "weight" {
			return 0, fmt.Errorf("length unit on weight measurement")
		}
	} else if unit == "kg" || unit == "kilogram" || unit == "ک" {
		if canonical != "weight" {
			return 0, fmt.Errorf("weight unit on non-weight measurement")
		}
	} else if unit == "cm" || unit == "centimeter" || unit == "centimeters" {
		if canonical == "weight" {
			return 0, fmt.Errorf("length unit on weight measurement")
		}
	} else if unit != "" {
		return 0, fmt.Errorf("unsupported measurement unit")
	}
	if !saneMeasurement(canonical, number) {
		return 0, fmt.Errorf("measurement is outside a sane range")
	}
	return number, nil
}

func saneMeasurement(key string, value float64) bool {
	switch key {
	case "height":
		return value >= 80 && value <= 250
	case "weight":
		return value >= 20 && value <= 300
	case "chest", "waist", "hip":
		return value >= 20 && value <= 250
	case "shoulder":
		return value >= 10 && value <= 100
	case "sleeve", "inseam", "length":
		return value >= 20 && value <= 180
	default:
		return false
	}
}

type normalizedMeasurement struct {
	value     float64
	source    string
	estimated bool
}

type chartCandidate struct {
	size      string
	values    map[string]float64
	available bool
	score     float64
	matched   int
	missing   int
}

// RecommendSize is the CPU-only recommendation engine. It has no database,
// network, logging, or persistence side effects and is therefore straightforward
// to exercise independently of the HTTP handler.
func RecommendSize(product models.Product, request models.SizeRecommendationRequest, sizingType *models.SizingType) (models.SizeRecommendationResponse, error) {
	response := models.SizeRecommendationResponse{
		Status: "insufficient_data", Approximate: true, ConfidenceLevel: "low",
		FitSummary: "اطلاعات کافی برای پیشنهاد سایز وجود ندارد.",
		Reasons:    []models.SizeRecommendationReason{}, Alternatives: []models.SizeRecommendationAlternative{},
		DataQuality:   models.SizeRecommendationDataQuality{UsedKeys: []string{}, EstimatedKeys: []string{}, MissingKeys: []string{}},
		EngineVersion: SizeRecommendationEngineVersion, RecommendedVariantID: request.VariantID,
	}
	measurements, err := normalizeRequestMeasurements(request)
	if err != nil {
		return response, err
	}
	if request.FitPreference == "" {
		return response, fmt.Errorf("fit_preference is required")
	}
	if request.FitPreference != "slim" && request.FitPreference != "regular" && request.FitPreference != "relaxed" {
		return response, fmt.Errorf("fit_preference must be slim, regular, or relaxed")
	}

	if request.VariantID != "" {
		found := false
		for _, variant := range product.ColorVariants {
			if variant.VariantID == request.VariantID {
				found = true
				break
			}
		}
		if !found {
			response.Status = "unavailable"
			response.FitSummary = "رنگ انتخاب‌شده دیگر در این محصول موجود نیست."
			return response, nil
		}
	}
	addQuestionnaireEstimates(measurements)

	chartRows := make([]chartCandidate, 0, len(product.SizeChart))
	freeSize := ""
	for _, row := range product.SizeChart {
		size := strings.TrimSpace(utils.NormalizePersianDigits(row.Size))
		if size == "" {
			continue
		}
		values := chartValues(row.Values, sizingType)
		if len(values) == 0 && isFreeSize(size) {
			freeSize = size
		}
		if len(values) > 0 {
			chartRows = append(chartRows, chartCandidate{size: size, values: values})
		}
	}
	if len(chartRows) == 0 {
		if freeSize != "" {
			available := sizeAvailable(product, request.VariantID, freeSize)
			response.Status, response.RecommendedSize = "no_chart", freeSize
			response.FitSummary = "این محصول فری‌سایز است؛ تناسب آن به فرم آزاد لباس و اندازه‌های شما بستگی دارد."
			if !available {
				response.Status = "unavailable"
			}
			return response, nil
		}
		response.Status = "no_chart"
		response.FitSummary = "برای این محصول جدول اندازه قابل استفاده‌ای ثبت نشده است."
		return response, nil
	}

	critical := chartKeys(chartRows)
	for _, key := range critical {
		if _, ok := measurements[key]; !ok {
			response.DataQuality.MissingKeys = append(response.DataQuality.MissingKeys, key)
		}
	}
	for key, m := range measurements {
		if containsMeasurementKey(critical, key) || key == "height" || key == "weight" {
			response.DataQuality.UsedKeys = append(response.DataQuality.UsedKeys, key)
		}
		if m.estimated && (containsMeasurementKey(critical, key) || key == "height" || key == "weight") {
			response.DataQuality.EstimatedKeys = append(response.DataQuality.EstimatedKeys, key)
		}
	}
	sort.Strings(response.DataQuality.UsedKeys)
	sort.Strings(response.DataQuality.EstimatedKeys)
	sort.Strings(response.DataQuality.MissingKeys)
	if len(response.DataQuality.UsedKeys) == 0 {
		response.LimitingMeasurement = firstOrEmpty(response.DataQuality.MissingKeys)
		return response, nil
	}

	for i := range chartRows {
		chartRows[i].available = sizeAvailable(product, request.VariantID, chartRows[i].size)
		chartRows[i].score, chartRows[i].matched, chartRows[i].missing = scoreCandidate(chartRows[i].values, measurements, request.FitPreference)
	}
	available := make([]chartCandidate, 0, len(chartRows))
	for _, candidate := range chartRows {
		if candidate.available {
			available = append(available, candidate)
		}
	}
	if len(available) == 0 {
		response.Status = "unavailable"
		response.FitSummary = "هیچ سایزی در رنگ انتخاب‌شده موجود نیست."
		return response, nil
	}
	// Usual size is intentionally only a small tie-breaker.
	for i := range available {
		if request.UsualSize != "" && sameSize(available[i].size, request.UsualSize) {
			available[i].score -= 0.06
		}
	}
	sort.SliceStable(available, func(i, j int) bool { return available[i].score < available[j].score })
	best := available[0]
	response.LimitingMeasurement = limitingMeasurement(best.values, measurements)
	if best.score > 1.35 {
		response.Status = "no_match"
		response.FitSummary = "اندازه‌های واردشده با جدول این محصول تطابق کافی ندارد."
		addAlternatives(&response, chartRows, best.size, request.FitPreference)
		return response, nil
	}
	response.Status, response.RecommendedSize = "recommended", best.size
	response.ConfidenceLevel = confidence(best, available, measurements, response.DataQuality.MissingKeys)
	response.FitSummary = fitSummary(request.FitPreference, response.ConfidenceLevel)
	response.Reasons = recommendationReasons(best, measurements, response.LimitingMeasurement)
	addAlternatives(&response, chartRows, best.size, request.FitPreference)
	return response, nil
}

func normalizeRequestMeasurements(request models.SizeRecommendationRequest) (map[string]normalizedMeasurement, error) {
	result := map[string]normalizedMeasurement{}
	for rawKey, rawValue := range request.Measurements {
		key := CanonicalMeasurementKey(rawKey)
		if key == "" {
			continue
		}
		value, err := ParseMeasurementValue(rawValue, key)
		if err != nil {
			return nil, fmt.Errorf("invalid %s measurement", key)
		}
		source := "measured"
		for sourceKey, sourceValue := range request.MeasurementSources {
			if sourceKey == rawKey || CanonicalMeasurementKey(sourceKey) == key {
				source = strings.ToLower(strings.TrimSpace(sourceValue))
				break
			}
		}
		if source != "measured" && source != "estimated" && source != "reference" {
			return nil, fmt.Errorf("invalid measurement source")
		}
		if key == "height" && source == "reference" {
			return nil, fmt.Errorf("invalid measurement source")
		}
		result[key] = normalizedMeasurement{value: value, source: source, estimated: source == "estimated"}
	}
	for rawKey, source := range request.MeasurementSources {
		if CanonicalMeasurementKey(rawKey) == "" {
			continue
		}
		source = strings.ToLower(strings.TrimSpace(source))
		if source != "measured" && source != "estimated" && source != "reference" {
			return nil, fmt.Errorf("invalid measurement source")
		}
		if CanonicalMeasurementKey(rawKey) == "height" && source == "reference" {
			return nil, fmt.Errorf("invalid measurement source")
		}
	}
	return result, nil
}

func addQuestionnaireEstimates(m map[string]normalizedMeasurement) {
	height, hasHeight := m["height"]
	weight, hasWeight := m["weight"]
	if !hasHeight || !hasWeight {
		return
	}
	bmi := weight.value / math.Pow(height.value/100, 2)
	if !finite(bmi) {
		return
	}
	add := func(key string, value float64) {
		if _, ok := m[key]; !ok && saneMeasurement(key, value) {
			m[key] = normalizedMeasurement{value: value, source: "estimated", estimated: true}
		}
	}
	add("chest", .53*height.value+1.2*(bmi-22))
	add("waist", .43*height.value+1.1*(bmi-22))
	add("hip", .53*height.value+.9*(bmi-22))
	add("shoulder", .24*height.value)
	add("sleeve", .34*height.value)
	add("inseam", .44*height.value)
}

func chartValues(raw map[string]string, sizingType *models.SizingType) map[string]float64 {
	values := map[string]float64{}
	for rawKey, rawValue := range raw {
		key := CanonicalMeasurementKey(rawKey)
		if key == "" && sizingType != nil {
			for _, definition := range sizingType.Measurements {
				if definition.Key == rawKey || definition.Label == rawKey {
					key = CanonicalMeasurementKey(definition.Key)
					if key == "" {
						key = CanonicalMeasurementKey(definition.Label)
					}
					break
				}
			}
		}
		if key == "" {
			continue
		}
		numbers := chartNumberRE.FindAllString(utils.NormalizePersianDigits(rawValue), -1)
		if len(numbers) == 0 {
			continue
		}
		parsed := make([]float64, 0, len(numbers))
		for _, rawNumber := range numbers {
			number, err := strconv.ParseFloat(strings.ReplaceAll(rawNumber, ",", "."), 64)
			if err == nil && finite(number) && number > 0 {
				parsed = append(parsed, number)
			}
		}
		if len(parsed) == 0 {
			continue
		}
		value := parsed[0]
		if len(parsed) > 1 {
			value = (parsed[0] + parsed[1]) / 2
		}
		unit := strings.ToLower(strings.ReplaceAll(rawValue, "\u200c", ""))
		unit = strings.TrimSpace(unit)
		if strings.Contains(unit, "inch") || strings.Contains(unit, "اینچ") || strings.HasSuffix(unit, "in") {
			value *= 2.54
		} else if strings.Contains(unit, "m") && !strings.Contains(unit, "cm") {
			value *= 100
		}
		if saneMeasurement(key, value) {
			values[key] = value
		}
	}
	return values
}

func scoreCandidate(values map[string]float64, measurements map[string]normalizedMeasurement, fit string) (float64, int, int) {
	total, weight := 0.0, 0.0
	matched, missing := 0, 0
	for key, chartValue := range values {
		measurement, ok := measurements[key]
		if !ok {
			missing++
			continue
		}
		target := measurement.value
		// Reference-garment values already describe the garment. Body values,
		// including questionnaire estimates, need the requested ease applied.
		if measurement.source != "reference" && (key == "chest" || key == "waist" || key == "hip") {
			target *= map[string]float64{"slim": 1.03, "regular": 1.08, "relaxed": 1.13}[fit]
		}
		tolerance := math.Max(2.0, chartValue*.05)
		if key == "chest" || key == "waist" || key == "hip" {
			tolerance = math.Max(3.0, chartValue*.055)
		}
		error := math.Abs(chartValue-target) / tolerance
		importance := 1.0
		if measurement.source == "measured" || measurement.source == "reference" {
			importance = 1.35
		} else {
			importance = .65
		}
		total += error * error * importance
		weight += importance
		matched++
	}
	if missing > 0 {
		total += float64(missing) * .22
		weight += float64(missing) * .22
	}
	if weight == 0 {
		return 99, 0, missing
	}
	return total / weight, matched, missing
}

func sizeAvailable(product models.Product, variantID, size string) bool {
	if len(product.ColorVariants) == 0 {
		return product.InStock
	}
	for _, variant := range product.ColorVariants {
		if variantID != "" && variant.VariantID != variantID {
			continue
		}
		for _, sizeVariant := range variant.Sizes {
			if sizeVariant.Quantity > 0 && sameSize(sizeVariant.Size, size) {
				return true
			}
		}
	}
	return false
}

func chartKeys(rows []chartCandidate) []string {
	seen := map[string]bool{}
	keys := []string{}
	for _, row := range rows {
		for key := range row.values {
			if !seen[key] {
				seen[key] = true
				keys = append(keys, key)
			}
		}
	}
	sort.Strings(keys)
	return keys
}
func containsMeasurementKey(values []string, wanted string) bool {
	for _, value := range values {
		if value == wanted {
			return true
		}
	}
	return false
}
func finite(value float64) bool { return !math.IsNaN(value) && !math.IsInf(value, 0) }
func firstOrEmpty(values []string) string {
	if len(values) > 0 {
		return values[0]
	}
	return ""
}
func isFreeSize(size string) bool {
	normalized := strings.ToLower(strings.TrimSpace(size))
	normalized = strings.NewReplacer(" ", "", "-", "", "_", "").Replace(normalized)
	return normalized == "freesize" || normalized == "onesize" || normalized == "فریسایز" || normalized == "تکسایز" || normalized == "سایزآزاد"
}
func sameSize(a, b string) bool {
	return strings.EqualFold(strings.ReplaceAll(strings.TrimSpace(utils.NormalizePersianDigits(a)), " ", ""), strings.ReplaceAll(strings.TrimSpace(utils.NormalizePersianDigits(b)), " ", ""))
}

func confidence(best chartCandidate, ranked []chartCandidate, measurements map[string]normalizedMeasurement, missing []string) string {
	exact := 0
	for _, measurement := range measurements {
		if !measurement.estimated {
			exact++
		}
	}
	margin := 1.0
	if len(ranked) > 1 {
		margin = ranked[1].score - ranked[0].score
	}
	if best.score < .5 && exact >= 2 && margin > .18 && len(missing) == 0 {
		return "high"
	}
	if best.score < 1.0 && (exact > 0 || best.matched >= 2) {
		return "medium"
	}
	return "low"
}

func fitSummary(fit, confidence string) string {
	names := map[string]string{"slim": "نسبتاً جذب", "regular": "استاندارد", "relaxed": "آزادتر"}
	return fmt.Sprintf("پیشنهاد %s با اطمینان %s است؛ اندازه‌گیری واقعی را به تخمین ترجیح دهید.", names[fit], map[string]string{"high": "بالا", "medium": "متوسط", "low": "پایین"}[confidence])
}
func limitingMeasurement(values map[string]float64, measurements map[string]normalizedMeasurement) string {
	key, score := "", -1.0
	for dimension, chart := range values {
		if m, ok := measurements[dimension]; ok {
			difference := math.Abs(chart - m.value)
			if difference > score {
				key, score = dimension, difference
			}
		}
	}
	return key
}
func recommendationReasons(best chartCandidate, measurements map[string]normalizedMeasurement, limiting string) []models.SizeRecommendationReason {
	reasons := []models.SizeRecommendationReason{}
	if limiting != "" {
		reasons = append(reasons, models.SizeRecommendationReason{Key: limiting, Label: limiting, Message: "این اندازه بیشترین اثر را در تفکیک سایزهای نزدیک داشت.", Direction: "unknown"})
	}
	for key, m := range measurements {
		if m.estimated {
			reasons = append(reasons, models.SizeRecommendationReason{Key: key, Label: key, Message: "این مقدار از قد و وزن به‌صورت تقریبی برآورد شد.", Direction: "unknown"})
			if len(reasons) >= 3 {
				break
			}
		}
	}
	return reasons
}
func addAlternatives(response *models.SizeRecommendationResponse, rows []chartCandidate, selected string, fit string) {
	ranked := append([]chartCandidate(nil), rows...)
	sort.SliceStable(ranked, func(i, j int) bool { return ranked[i].score < ranked[j].score })
	for _, row := range ranked {
		if sameSize(row.size, selected) || len(response.Alternatives) >= 3 {
			continue
		}
		response.Alternatives = append(response.Alternatives, models.SizeRecommendationAlternative{Size: row.size, Available: row.available, FitSummary: fitSummary(fit, "low")})
	}
}
