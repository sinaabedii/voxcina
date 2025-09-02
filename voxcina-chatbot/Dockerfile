# Alternative Dockerfile using Alpine Linux (smaller, faster)
FROM python:3.10-alpine

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1

# Set work directory
WORKDIR /app

# Install system dependencies for Alpine
RUN apk add --no-cache \
    gcc \
    g++ \
    musl-dev \
    libffi-dev \
    openssl-dev \
    python3-dev \
    pkgconfig \
    make \
    curl \
    git \
    && pip install --upgrade pip setuptools wheel

# Copy minimal requirements
COPY requirements-minimal.txt .

# Install core dependencies step by step
RUN pip install --no-cache-dir websockets aiohttp uvloop \
    && pip install --no-cache-dir pymongo motor redis \
    && pip install --no-cache-dir openai \
    && pip install --no-cache-dir numpy scikit-learn \
    && pip install --no-cache-dir sentence-transformers \
    && pip install --no-cache-dir python-dotenv requests pyjwt \
    && pip install --no-cache-dir pandas pydantic \
    && pip install --no-cache-dir "cryptography>=3.4.8,<4.0.0" \
    && pip install --no-cache-dir prometheus-client

# Install Persian language support (optional)
RUN pip install --no-cache-dir hazm || echo "hazm installation failed, continuing..."

# Install vector database
RUN pip install --no-cache-dir faiss-cpu || pip install --no-cache-dir chromadb || echo "Vector DB installation failed"

# Copy application code
COPY voxcina_chatbot.py .
COPY config.py . 
COPY utils/ ./utils/

# Create directories
RUN mkdir -p /app/data/chroma_db /app/logs

# Create non-root user
RUN adduser -D -s /bin/sh chatbot \
    && chown -R chatbot:chatbot /app

USER chatbot

# Expose port
EXPOSE 8765

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import socket; s=socket.socket(); s.connect(('localhost', 8765)); s.close()" || exit 1

# Run application
CMD ["python", "voxcina_chatbot.py"]