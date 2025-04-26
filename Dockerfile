# ┌────────────────────────── BUILD STAGE ────────────────────────────┐
FROM docker.arvancloud.ir/golang:1.24-alpine AS builder

# 1) Use a stable Go proxy mirror first, then fall back to direct fetch
ENV GOPROXY=https://goproxy.cn,direct
# 2) Disable the public checksum DB
ENV GOSUMDB=off

# 3) Install git so `go mod download` can clone repos
RUN apk update && \
    apk --no-cache add git

WORKDIR /app

# 4) Fetch modules
COPY go.mod go.sum ./
RUN go mod download

# 5) Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .



# ┌────────────────────────── RUNTIME STAGE ──────────────────────────┐
FROM alpine:3.21

# Fresh index + TLS certs (and tzdata if you need it)
RUN apk update && \
    apk --no-cache add \
      ca-certificates \
      tzdata

WORKDIR /root/

# Bring in the compiled binary + admin assets
COPY --from=builder /app/main .
COPY admin/ admin/

EXPOSE 8080
CMD ["./main"]
