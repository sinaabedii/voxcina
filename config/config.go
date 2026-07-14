package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port              string
	DBURI             string
	DBName            string
	JWTSecret         string
	BraveSearchAPIKey string
	BraveSearchBaseURL string
	BlogWorkerConcurrency int
	BlogMaxRetries    int
}

func LoadConfig() *Config {
	return &Config{
		Port: getEnv("PORT", "8080"),
		DBURI: getEnv(
			"MONGODB_URI",
			"mongodb://admin:password@mongo:27017/admin?authSource=admin",
		),
		DBName:    getEnv("DB_NAME", "ecommerce"),
		JWTSecret: getEnv("JWT_SECRET", "137888"),
		BraveSearchAPIKey: getEnv("BRAVE_SEARCH_API_KEY", ""),
		BraveSearchBaseURL: getEnv("BRAVE_SEARCH_BASE_URL", "https://api.search.brave.com"),
		BlogWorkerConcurrency: getEnvInt("BLOG_WORKER_CONCURRENCY", 3),
		BlogMaxRetries: getEnvInt("BLOG_MAX_RETRIES", 3),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		var intVal int
		if _, err := fmt.Sscanf(value, "%d", &intVal); err == nil {
			return intVal
		}
	}
	return fallback
}
