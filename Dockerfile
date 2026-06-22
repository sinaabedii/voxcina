# ┌────────────────────────── BUILD STAGE ────────────────────────────┐
FROM docker.arvancloud.ir/golang:1.24 AS builder

# Set GOPROXY to use Iranian mirror
ENV GOPROXY=https://package-mirror.liara.ir/repository/go/,direct

WORKDIR /build

# Copy go.mod and go.sum first to leverage caching
COPY go.mod go.sum ./

# Download dependencies (cached unless go.mod or go.sum changes)
RUN go mod download

# Copy the rest of the application code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /build/main .

# ┌────────────────────────── RUNTIME STAGE ──────────────────────────┐
FROM docker.arvancloud.ir/alpine:3.21

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /build/main .

# Copy configuration files needed at runtime (e.g., AI prompts)
COPY --from=builder /build/config ./config

# Copy the startup script
COPY --from=builder /build/start.sh .

# Create necessary directories with proper permissions
RUN mkdir -p admin uploads/products/main uploads/categories && \
    chmod -R 777 uploads && \
    chmod +x start.sh

EXPOSE 8080
CMD ["./start.sh"]
