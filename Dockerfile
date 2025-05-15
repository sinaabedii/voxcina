# ┌────────────────────────── BUILD STAGE ────────────────────────────┐
FROM docker.arvancloud.ir/golang:1.24-alpine AS builder

# Install git and build tools
RUN apk update && \
    apk --no-cache add git build-base

# Set GOPROXY to use a proxy that works in Iran
ENV GOPROXY=https://goproxy.io,direct

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

RUN apk update && \
    apk --no-cache add \
      ca-certificates \
      tzdata

WORKDIR /app

# Copy the binary from the builder stage
COPY --from=builder /build/main .

# Create necessary directories
RUN mkdir -p admin uploads

# If you have admin files, copy them in a separate step
# COPY admin/ admin/

EXPOSE 8080
CMD ["./main"]