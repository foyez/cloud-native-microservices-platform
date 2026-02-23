package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/foyez/eks-microservices/microservices/user-service/handlers"
	"github.com/gin-gonic/gin"
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
	port := os.Getenv("PORT")

	if port == "" {
		port = "8080"
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

	// Test connection
	err = db.Ping()
	if err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	log.Println("Connected to database successfully")

	// Create users table if not exists
	createTableSQL := `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `

	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Fatal("Failed to create table:", err)
	}

	// Initialize handlers
	userHandler := &handlers.UserHandler{DB: db}

	// Setup Gin Router
	router := gin.Default()

	// Health check
	router.GET("/health", userHandler.HealthCheck)

	// API routes
	v1API := router.Group("/api/v1")
	{
		v1API.POST("/users", userHandler.CreateUser)
		v1API.POST("/users/login", userHandler.Login)
		v1API.GET("/users/:id", userHandler.GetUser)
	}

	log.Printf("User service starting on port %s", port)
	router.Run(":" + port)
}
