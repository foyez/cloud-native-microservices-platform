package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/foyez/eks-microservices/microservices/product-service/handlers"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	_ "github.com/lib/pq"
)

func main() {
	// Get environment variables
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	sslmode := os.Getenv("SSLMODE")
	redisHost := os.Getenv("REDIS_HOST")
	redisPort := os.Getenv("REDIS_PORT")
	port := os.Getenv("PORT")

	if port == "" {
		port = "8081"
	}

	// Connect to PostgreSQL
	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPassword, dbName, sslmode,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	log.Println("Connected to database successfully")

	// Connect to Redis
	redisClient := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", redisHost, redisPort),
		Password: "",
		DB:       0,
	})

	_, err = redisClient.Ping(redisClient.Context()).Result()
	if err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}

	log.Println("Connected to Redis successfully")

	// Create products table
	createTableSQL := `
    CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER NOT NULL,
        category VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    `

	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Fatal("Failed to create table:", err)
	}

	// Initialize handlers
	productHandler := &handlers.ProductHandler{
		DB:    db,
		Redis: redisClient,
	}

	// Setup Gin router
	router := gin.Default()

	// Health check
	router.GET("/health", productHandler.HealthCheck)

	// API routes
	v1API := router.Group("/api/v1")
	{
		v1API.POST("/products", productHandler.CreateProduct)
		v1API.GET("/products", productHandler.GetProducts)
		v1API.GET("/products/:id", productHandler.GetProduct)
		v1API.PATCH("/products/:id", productHandler.UpdateProduct)
		v1API.DELETE("/products/:id", productHandler.DeleteProduct)
	}

	log.Printf("Product service starting on port %s", port)
	router.Run(":" + port)
}
