// MongoDB migration script: Normalize Persian/Arabic digits in product size strings
// Run with: docker exec -i mongodb mongosh < scripts/normalize_sizes.js

db = db.getSiblingDB("admin");
db.auth("voxcina_b88dc8ce80ac", "u5EZGd2TzezJR6vFMYfJTuET8i2LB5xf");
db = db.getSiblingDB("ecommerce");

// Persian digits: ۰۱۲۳۴۵۶۷۸۹ (U+06F0 - U+06F9)
// Arabic digits:  ٠١٢٣٤٥٦٧٨٩ (U+0660 - U+0669)

function normalizePersianDigits(str) {
  var result = "";
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    if (code >= 0x06F0 && code <= 0x06F9) {
      // Persian digit -> Latin
      result += String.fromCharCode(code - 0x06F0 + 48);
    } else if (code >= 0x0660 && code <= 0x0669) {
      // Arabic digit -> Latin
      result += String.fromCharCode(code - 0x0660 + 48);
    } else {
      result += str[i];
    }
  }
  return result.trim();
}

var products = db.products.find({}).toArray();
var updated = 0;

products.forEach(function(p) {
  var modified = false;
  if (p.color_variants) {
    p.color_variants.forEach(function(cv) {
      if (cv.sizes) {
        cv.sizes.forEach(function(s) {
          var normalized = normalizePersianDigits(s.size);
          if (normalized !== s.size) {
            print("Product " + p.name + ": size [" + s.size + "] -> [" + normalized + "]");
            s.size = normalized;
            modified = true;
          }
        });
      }
    });
  }
  if (modified) {
    db.products.updateOne({ _id: p._id }, { $set: { color_variants: p.color_variants } });
    updated++;
  }
});

print("\nDone. Updated " + updated + " products.");
