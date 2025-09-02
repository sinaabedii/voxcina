# Voxcina Persian Fashion E-commerce RAG Chatbot with WebSocket
import asyncio
import websockets
import json
import logging
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import jwt
from dataclasses import dataclass
import re
import unicodedata

# Database and Vector Store
from pymongo import MongoClient
from motor.motor_asyncio import AsyncIOMotorClient
import chromadb
from chromadb.config import Settings

# LLM and Embeddings
import openai
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# HTTP Client for API calls
import aiohttp
import requests

# Persian text processing
import hazm
from persiantools.jdatetime import JalaliDate
from persiantools.digits import to_persian, to_english

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
@dataclass
class Config:
    # Database
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "voxcina")
    
    # Vector Database
    CHROMA_DB_PATH: str = os.getenv("CHROMA_DB_PATH", "./chroma_db")
    
    # LLM Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-ada-002")
    
    # WebSocket
    WS_HOST: str = os.getenv("WS_HOST", "localhost")
    WS_PORT: int = int(os.getenv("WS_PORT", "8765"))
    
    # API
    API_BASE_URL: str = os.getenv("API_BASE_URL", "http://localhost:8080/api")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-jwt-secret")
    
    # Chat Configuration
    MAX_HISTORY_LENGTH: int = 10
    SIMILARITY_THRESHOLD: float = 0.7
    MAX_RESULTS: int = 5

config = Config()

class PersianTextProcessor:
    """Persian text processing utilities"""
    
    def __init__(self):
        self.normalizer = hazm.Normalizer()
        self.stemmer = hazm.Stemmer()
        self.lemmatizer = hazm.Lemmatizer()
        
        # Persian synonyms for fashion terms
        self.fashion_synonyms = {
            'پیراهن': ['پیرهن', 'شرت', 'بلوز'],
            'شلوار': ['پنت', 'پانت', 'شلوارک'],
            'کفش': ['کتونی', 'کتانی', 'بوت'],
            'کیف': ['ساک', 'کوله'],
            'لباس': ['پوشاک', 'البسه'],
            'رنگ': ['کالر'],
            'سایز': ['اندازه', 'نمره'],
            'قیمت': ['نرخ', 'مبلغ', 'هزینه'],
            'تخفیف': ['تخفیف', 'کمپین', 'آف'],
        }
        
        # Color mapping
        self.color_mapping = {
            'سفید': ['white', 'سپید'],
            'سیاه': ['black', 'مشکی'],
            'قرمز': ['red', 'سرخ'],
            'آبی': ['blue', 'آبی'],
            'سبز': ['green'],
            'زرد': ['yellow'],
            'بنفش': ['purple', 'ارغوانی'],
            'صورتی': ['pink', 'گلی'],
            'قهوه‌ای': ['brown', 'بژ'],
            'خاکستری': ['gray', 'طوسی'],
        }
    
    def normalize_text(self, text: str) -> str:
        """Normalize Persian text"""
        if not text:
            return ""
        
        # Normalize Persian text
        text = self.normalizer.normalize(text)
        
        # Convert Persian digits to English
        text = to_english(text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from Persian text"""
        text = self.normalize_text(text)
        
        # Tokenize
        words = hazm.word_tokenize(text)
        
        # Remove stopwords and punctuation
        stopwords = hazm.stopwords_list()
        keywords = [word for word in words if word not in stopwords and len(word) > 1]
        
        # Add synonyms
        expanded_keywords = keywords.copy()
        for keyword in keywords:
            if keyword in self.fashion_synonyms:
                expanded_keywords.extend(self.fashion_synonyms[keyword])
        
        return list(set(expanded_keywords))
    
    def extract_filters(self, text: str) -> Dict[str, Any]:
        """Extract filters from user query"""
        filters = {}
        text = self.normalize_text(text)
        
        # Extract colors
        for persian_color, alternatives in self.color_mapping.items():
            if persian_color in text or any(alt in text for alt in alternatives):
                filters['color'] = persian_color
                break
        
        # Extract size patterns
        size_patterns = [
            r'سایز\s*([A-Z]{1,3}|\d+)',
            r'اندازه\s*([A-Z]{1,3}|\d+)',
            r'نمره\s*(\d+)',
        ]
        
        for pattern in size_patterns:
            match = re.search(pattern, text)
            if match:
                filters['size'] = match.group(1)
                break
        
        # Extract price range
        price_patterns = [
            r'زیر\s*(\d+)',
            r'کمتر\s*از\s*(\d+)',
            r'تا\s*(\d+)',
            r'بین\s*(\d+)\s*تا\s*(\d+)',
        ]
        
        for pattern in price_patterns:
            match = re.search(pattern, text)
            if match:
                if 'بین' in pattern:
                    filters['price_range'] = [int(match.group(1)), int(match.group(2))]
                else:
                    filters['max_price'] = int(match.group(1))
                break
        
        # Extract gender
        if any(word in text for word in ['مردانه', 'آقایان', 'مرد']):
            filters['gender'] = 'مردانه'
        elif any(word in text for word in ['زنانه', 'خانوم', 'زن']):
            filters['gender'] = 'زنانه'
        elif any(word in text for word in ['بچگانه', 'کودک', 'بچه']):
            filters['gender'] = 'بچگانه'
        
        return filters

class VectorStore:
    """ChromaDB vector store for product embeddings"""
    
    def __init__(self):
        self.client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=config.CHROMA_DB_PATH
        ))
        
        # Initialize embedding model
        self.embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        
        # Collections
        self.products_collection = self.client.get_or_create_collection(
            name="products",
            metadata={"description": "Product embeddings for similarity search"}
        )
        
        self.blogs_collection = self.client.get_or_create_collection(
            name="blogs",
            metadata={"description": "Blog post embeddings for content search"}
        )
    
    def add_product(self, product: Dict[str, Any]):
        """Add product to vector store"""
        try:
            # Create searchable text
            search_text = self._create_product_search_text(product)
            
            # Generate embedding
            embedding = self.embedding_model.encode(search_text).tolist()
            
            # Add to collection
            self.products_collection.add(
                embeddings=[embedding],
                documents=[search_text],
                metadatas=[{
                    "product_id": str(product["_id"]),
                    "name": product["name"],
                    "category": product.get("category", ""),
                    "price": product.get("price", 0),
                    "brand": product.get("brand", ""),
                }],
                ids=[str(product["_id"])]
            )
            
        except Exception as e:
            logger.error(f"Error adding product to vector store: {e}")
    
    def search_products(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """Search for similar products"""
        try:
            # Generate query embedding
            query_embedding = self.embedding_model.encode(query).tolist()
            
            # Search
            results = self.products_collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                include=["documents", "metadatas", "distances"]
            )
            
            # Format results
            formatted_results = []
            for i, metadata in enumerate(results['metadatas'][0]):
                formatted_results.append({
                    "product_id": metadata["product_id"],
                    "name": metadata["name"],
                    "category": metadata["category"],
                    "price": metadata["price"],
                    "brand": metadata["brand"],
                    "similarity": 1 - results['distances'][0][i],  # Convert distance to similarity
                    "document": results['documents'][0][i]
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching products: {e}")
            return []
    
    def _create_product_search_text(self, product: Dict[str, Any]) -> str:
        """Create searchable text for product"""
        text_parts = [
            product.get("name", ""),
            product.get("description", ""),
            product.get("category", ""),
            product.get("brand", ""),
            " ".join(product.get("tags", [])),
            " ".join([f"{k}:{v}" for k, v in product.get("attributes", {}).items()]),
        ]
        
        # Add variant information
        if "variants" in product:
            for variant in product["variants"]:
                text_parts.extend([
                    variant.get("color", ""),
                    variant.get("size", ""),
                    variant.get("material", ""),
                ])
        
        return " ".join(filter(None, text_parts))

class DatabaseManager:
    """MongoDB database manager"""
    
    def __init__(self):
        self.client = AsyncIOMotorClient(config.MONGODB_URL)
        self.db = self.client[config.DB_NAME]
        
        # Collections
        self.products = self.db.products
        self.categories = self.db.categories
        self.brands = self.db.brands
        self.users = self.db.users
        self.orders = self.db.orders
        self.reviews = self.db.reviews
        self.blog_posts = self.db.blog_posts
        self.cart = self.db.cart
        self.discounts = self.db.discounts
    
    async def search_products(self, query: str, filters: Dict[str, Any] = None, 
                            limit: int = 10) -> List[Dict[str, Any]]:
        """Search products in database"""
        try:
            # Build MongoDB query
            mongo_query = {"active": True}
            
            # Text search
            if query:
                mongo_query["$text"] = {"$search": query}
            
            # Apply filters
            if filters:
                if "category" in filters:
                    mongo_query["category"] = filters["category"]
                
                if "brand" in filters:
                    mongo_query["brand"] = filters["brand"]
                
                if "price_range" in filters:
                    mongo_query["price"] = {
                        "$gte": filters["price_range"][0],
                        "$lte": filters["price_range"][1]
                    }
                elif "max_price" in filters:
                    mongo_query["price"] = {"$lte": filters["max_price"]}
                
                if "color" in filters:
                    mongo_query["variants.color"] = filters["color"]
                
                if "size" in filters:
                    mongo_query["variants.size"] = filters["size"]
            
            # Execute query
            cursor = self.products.find(mongo_query).limit(limit)
            products = await cursor.to_list(length=limit)
            
            return products
            
        except Exception as e:
            logger.error(f"Error searching products: {e}")
            return []
    
    async def get_product_by_id(self, product_id: str) -> Optional[Dict[str, Any]]:
        """Get product by ID"""
        try:
            product = await self.products.find_one({"_id": product_id})
            return product
        except Exception as e:
            logger.error(f"Error getting product: {e}")
            return None
    
    async def get_user_orders(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's orders"""
        try:
            cursor = self.orders.find({"user_id": user_id}).sort("created_at", -1)
            orders = await cursor.to_list(length=10)
            return orders
        except Exception as e:
            logger.error(f"Error getting user orders: {e}")
            return []
    
    async def get_categories(self) -> List[Dict[str, Any]]:
        """Get all categories"""
        try:
            cursor = self.categories.find({"active": True})
            categories = await cursor.to_list(length=None)
            return categories
        except Exception as e:
            logger.error(f"Error getting categories: {e}")
            return []

class LLMService:
    """LLM service for generating responses"""
    
    def __init__(self):
        openai.api_key = config.OPENAI_API_KEY
        self.text_processor = PersianTextProcessor()
    
    async def generate_response(self, query: str, context: Dict[str, Any], 
                              chat_history: List[Dict[str, str]] = None) -> str:
        """Generate response using LLM"""
        try:
            # Build system prompt
            system_prompt = self._build_system_prompt(context)
            
            # Build messages
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add chat history
            if chat_history:
                for msg in chat_history[-config.MAX_HISTORY_LENGTH:]:
                    messages.append(msg)
            
            # Add current query
            messages.append({"role": "user", "content": query})
            
            # Generate response
            response = await openai.ChatCompletion.acreate(
                model=config.LLM_MODEL,
                messages=messages,
                max_tokens=500,
                temperature=0.7,
                top_p=0.9,
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating LLM response: {e}")
            return "متأسفم، در حال حاضر نمی‌توانم به سوال شما پاسخ دهم. لطفاً دوباره تلاش کنید."
    
    def _build_system_prompt(self, context: Dict[str, Any]) -> str:
        """Build system prompt with context"""
        prompt = """
شما یک مشاور فروش آنلاین برای فروشگاه مد و پوشاک وکسینا هستید.

وظایف شما:
1. پاسخ دادن به سوالات مشتریان درباره محصولات
2. پیشنهاد محصولات مناسب بر اساس نیاز مشتری
3. راهنمایی در مورد سایز، رنگ و استایل
4. ارائه اطلاعات درباره قیمت، تخفیف و موجودی
5. کمک در فرآیند خرید

قوانین مهم:
- همیشه به زبان فارسی پاسخ دهید
- مؤدب، دوستانه و حرفه‌ای باشید
- اطلاعات دقیق و کاربردی ارائه دهید
- اگر اطلاعات کافی ندارید، صادقانه اعلام کنید
- محصولات را با جزئیات معرفی کنید (نام، قیمت، ویژگی‌ها)
- برای پیشنهادات، دلیل انتخاب را توضیح دهید

اطلاعات موجود:
"""
        
        # Add products context
        if "products" in context and context["products"]:
            prompt += "\nمحصولات یافت شده:\n"
            for product in context["products"]:
                prompt += f"- {product.get('name', 'نامشخص')}: {product.get('price', 0):,} تومان\n"
                if product.get('description'):
                    prompt += f"  توضیحات: {product['description']}\n"
        
        # Add user context
        if "user" in context and context["user"]:
            prompt += f"\nاطلاعات کاربر: {context['user'].get('name', 'مشتری گرامی')}\n"
        
        # Add categories context
        if "categories" in context and context["categories"]:
            prompt += "\nدسته‌بندی‌های موجود:\n"
            for category in context["categories"]:
                prompt += f"- {category.get('name', '')}\n"
        
        return prompt

class ChatbotCore:
    """Main chatbot logic"""
    
    def __init__(self):
        self.db = DatabaseManager()
        self.vector_store = VectorStore()
        self.llm = LLMService()
        self.text_processor = PersianTextProcessor()
        
        # Chat sessions
        self.chat_sessions = {}
    
    async def process_message(self, user_id: str, message: str, 
                            session_id: str = None) -> Dict[str, Any]:
        """Process user message and generate response"""
        try:
            # Initialize session if needed
            if session_id not in self.chat_sessions:
                self.chat_sessions[session_id] = {
                    "history": [],
                    "context": {},
                    "user_id": user_id,
                    "created_at": datetime.now()
                }
            
            session = self.chat_sessions[session_id]
            
            # Process message
            normalized_message = self.text_processor.normalize_text(message)
            keywords = self.text_processor.extract_keywords(normalized_message)
            filters = self.text_processor.extract_filters(normalized_message)
            
            # Search for relevant products
            vector_results = self.vector_store.search_products(
                normalized_message, n_results=config.MAX_RESULTS
            )
            
            db_results = await self.db.search_products(
                " ".join(keywords), filters, limit=config.MAX_RESULTS
            )
            
            # Get categories for context
            categories = await self.db.get_categories()
            
            # Build context
            context = {
                "products": db_results + [
                    await self.db.get_product_by_id(r["product_id"]) 
                    for r in vector_results
                ],
                "categories": categories,
                "filters": filters,
                "keywords": keywords,
            }
            
            # Generate response
            response = await self.llm.generate_response(
                normalized_message, context, session["history"]
            )
            
            # Update session
            session["history"].append({"role": "user", "content": message})
            session["history"].append({"role": "assistant", "content": response})
            session["context"] = context
            
            # Prepare response
            return {
                "response": response,
                "products": context["products"][:3],  # Top 3 products
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            return {
                "response": "متأسفم، خطایی رخ داده است. لطفاً دوباره تلاش کنید.",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

class WebSocketHandler:
    """WebSocket connection handler"""
    
    def __init__(self):
        self.chatbot = ChatbotCore()
        self.active_connections = {}
    
    async def handle_connection(self, websocket, path):
        """Handle new WebSocket connection"""
        connection_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}:{datetime.now().timestamp()}"
        self.active_connections[connection_id] = {
            "websocket": websocket,
            "user_id": None,
            "session_id": None,
            "connected_at": datetime.now()
        }
        
        logger.info(f"New WebSocket connection: {connection_id}")
        
        try:
            # Send welcome message
            await self.send_message(websocket, {
                "type": "welcome",
                "message": "سلام! به وکسینا خوش آمدید. چطور می‌تونم کمکتون کنم؟",
                "session_id": connection_id
            })
            
            async for message in websocket:
                await self.handle_message(connection_id, message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"WebSocket connection closed: {connection_id}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            if connection_id in self.active_connections:
                del self.active_connections[connection_id]
    
    async def handle_message(self, connection_id: str, message: str):
        """Handle incoming message"""
        try:
            data = json.loads(message)
            connection = self.active_connections[connection_id]
            websocket = connection["websocket"]
            
            message_type = data.get("type", "chat")
            
            if message_type == "auth":
                # Handle authentication
                await self.handle_auth(connection_id, data)
            
            elif message_type == "chat":
                # Handle chat message
                user_message = data.get("message", "")
                user_id = connection.get("user_id", "anonymous")
                session_id = connection.get("session_id", connection_id)
                
                # Process message
                response = await self.chatbot.process_message(
                    user_id, user_message, session_id
                )
                
                # Send response
                await self.send_message(websocket, {
                    "type": "response",
                    **response
                })
            
            elif message_type == "ping":
                # Handle ping
                await self.send_message(websocket, {"type": "pong"})
            
        except json.JSONDecodeError:
            await self.send_message(
                self.active_connections[connection_id]["websocket"],
                {"type": "error", "message": "Invalid JSON format"}
            )
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self.send_message(
                self.active_connections[connection_id]["websocket"],
                {"type": "error", "message": "Internal server error"}
            )
    
    async def handle_auth(self, connection_id: str, data: Dict[str, Any]):
        """Handle user authentication"""
        try:
            token = data.get("token")
            if token:
                # Verify JWT token
                payload = jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])
                user_id = payload.get("user_id")
                
                # Update connection
                self.active_connections[connection_id]["user_id"] = user_id
                self.active_connections[connection_id]["session_id"] = f"{user_id}_{connection_id}"
                
                await self.send_message(
                    self.active_connections[connection_id]["websocket"],
                    {"type": "auth_success", "user_id": user_id}
                )
            else:
                await self.send_message(
                    self.active_connections[connection_id]["websocket"],
                    {"type": "auth_error", "message": "Token required"}
                )
                
        except jwt.InvalidTokenError:
            await self.send_message(
                self.active_connections[connection_id]["websocket"],
                {"type": "auth_error", "message": "Invalid token"}
            )
    
    async def send_message(self, websocket, message: Dict[str, Any]):
        """Send message to WebSocket client"""
        try:
            await websocket.send(json.dumps(message, ensure_ascii=False))
        except Exception as e:
            logger.error(f"Error sending message: {e}")

# Main application
class VoxcinaChatbot:
    """Main chatbot application"""
    
    def __init__(self):
        self.ws_handler = WebSocketHandler()
    
    async def start_server(self):
        """Start WebSocket server"""
        logger.info(f"Starting Voxcina Chatbot WebSocket server on {config.WS_HOST}:{config.WS_PORT}")
        
        server = await websockets.serve(
            self.ws_handler.handle_connection,
            config.WS_HOST,
            config.WS_PORT,
            ping_interval=30,
            ping_timeout=10,
            close_timeout=10
        )
        
        logger.info("Chatbot server started successfully")
        await server.wait_closed()

# Initialize and populate vector store
async def initialize_vector_store():
    """Initialize vector store with existing products"""
    logger.info("Initializing vector store...")
    
    db = DatabaseManager()
    vector_store = VectorStore()
    
    # Get all products
    products = await db.search_products("", limit=1000)
    
    # Add to vector store
    for product in products:
        vector_store.add_product(product)
    
    logger.info(f"Added {len(products)} products to vector store")

# Run the application
async def main():
    """Main function"""
    # Initialize vector store
    await initialize_vector_store()
    
    # Start chatbot server
    chatbot = VoxcinaChatbot()
    await chatbot.start_server()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Shutting down Voxcina Chatbot...")

# Requirements:
"""
pip install \
    websockets \
    pymongo \
    motor \
    chromadb \
    openai \
    sentence-transformers \
    numpy \
    scikit-learn \
    aiohttp \
    requests \
    pyjwt \
    hazm \
    persiantools
"""

# Environment variables (.env file):
"""
MONGODB_URL=mongodb://localhost:27017
DB_NAME=voxcina
CHROMA_DB_PATH=./chroma_db
OPENAI_API_KEY=your-openai-api-key
LLM_MODEL=gpt-4
EMBEDDING_MODEL=text-embedding-ada-002
WS_HOST=localhost
WS_PORT=8765
API_BASE_URL=http://localhost:8080/api
JWT_SECRET=your-jwt-secret-key
"""