package config

import "os"

type Config struct {
	Port      string
	DBURI     string
	DBName    string
	JWTSecret string
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
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
