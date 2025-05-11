# ┌────────────────────────── BUILD STAGE ────────────────────────────┐
FROM docker.arvancloud.ir/golang:1.24-alpine AS builder

# Install git and build tools
RUN apk update && \
    apk --no-cache add git build-base

WORKDIR /build

# Copy everything into the container
COPY . .

# Recreate the go.mod file and fetch all dependencies correctly
RUN rm -f go.mod go.sum && \
    go mod init backEnd && \
    # Add required dependencies explicitly
    go get go.mongodb.org/mongo-driver/mongo && \
    go get go.mongodb.org/mongo-driver/bson && \
    go get go.mongodb.org/mongo-driver/bson/primitive && \
    go get go.mongodb.org/mongo-driver/mongo/options && \
    go get github.com/golang-jwt/jwt/v5 && \
    go get github.com/gorilla/mux && \
    go get golang.org/x/crypto/bcrypt && \
    # Tidy up to ensure all dependencies are in go.sum
    go mod tidy

# Verify all dependencies are present before building
RUN go mod download

# Build the application - build the whole project, not just main.go
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