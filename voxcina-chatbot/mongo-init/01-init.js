// MongoDB Initialization Script for Voxcina
db = db.getSiblingDB('voxcina');

// Create collections
db.createCollection('products');
db.createCollection('categories');
db.createCollection('brands');
db.createCollection('users');
db.createCollection('orders');
db.createCollection('reviews');
db.createCollection('blog_posts');
db.createCollection('cart');
db.createCollection('discounts');

// Create indexes for better performance
db.products.createIndex({ "name": "text", "description": "text", "tags": "text" });
db.products.createIndex({ "category": 1, "price": 1 });
db.products.createIndex({ "brand": 1, "active": 1 });
db.products.createIndex({ "variants.color": 1, "variants.size": 1 });
db.products.createIndex({ "created_at": -1 });

db.categories.createIndex({ "name": 1, "parent_id": 1 });
db.categories.createIndex({ "active": 1 });

db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "phone": 1 });

db.orders.createIndex({ "user_id": 1, "created_at": -1 });
db.orders.createIndex({ "status": 1 });

db.reviews.createIndex({ "product_id": 1, "rating": 1 });
db.reviews.createIndex({ "user_id": 1 });

db.blog_posts.createIndex({ "published": 1, "created_at": -1 });
db.blog_posts.createIndex({ "slug": 1 }, { unique: true });

print("Voxcina database initialized successfully!");
