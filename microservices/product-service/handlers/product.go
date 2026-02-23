package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/foyez/eks-microservices/microservices/product-service/models"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

type ProductHandler struct {
	DB    *sql.DB
	Redis *redis.Client
}

var ctx = context.Background()

// CreateProduct creates a new product
func (h *ProductHandler) CreateProduct(ctx *gin.Context) {
	var req models.ProductCreateRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var productID int
	err := h.DB.QueryRowContext(ctx,
		`INSERT INTO products (name, description, price, stock, category, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		req.Name, req.Description, req.Price, req.Stock, req.Category, time.Now(), time.Now(),
	).Scan(&productID)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	// Invalidate cache
	h.Redis.Del(ctx, "products:all")

	ctx.JSON(http.StatusCreated, gin.H{
		"id":      productID,
		"message": "Product created successfully",
	})
}

// GetProducts retrieves all products (with caching)
func (h *ProductHandler) GetProducts(ctx *gin.Context) {
	// Try to get from cache
	cached, err := h.Redis.Get(ctx, "products:all").Result()
	if err == nil {
		var products []models.Product
		if err := json.Unmarshal([]byte(cached), &products); err == nil {
			ctx.Header("X-Cache", "HIT")
			ctx.JSON(http.StatusOK, products)
			return
		}
	}

	// Cache miss - query database
	rows, err := h.DB.QueryContext(ctx,
		"SELECT id, name, description, price, stock, category, created_at, updated_at FROM products ORDER BY id",
	)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}
	defer rows.Close()

	var products []models.Product
	for rows.Next() {
		var p models.Product
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.Stock, &p.Category, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			continue
		}
		products = append(products, p)
	}

	if err = rows.Err(); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Cache the result for 5 minutes
	productsJSON, _ := json.Marshal(products)
	h.Redis.Set(ctx, "products:all", productsJSON, 5*time.Minute)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, products)
}

// GetProduct retrieves a single product by ID
func (h *ProductHandler) GetProduct(ctx *gin.Context) {
	productID := ctx.Param("id")

	// Try cache first
	cacheKey := fmt.Sprintf("product:%s", productID)
	cached, err := h.Redis.Get(ctx, cacheKey).Result()
	if err == nil {
		var product models.Product
		if err := json.Unmarshal([]byte(cached), &product); err == nil {
			ctx.Header("X-Cache", "HIT")
			ctx.JSON(http.StatusOK, product)
			return
		}
	}

	// Cache miss - query database
	var product models.Product
	err = h.DB.QueryRowContext(ctx,
		"SELECT id, name, description, price, stock, category, created_at, updated_at FROM products WHERE id = $1",
		productID,
	).Scan(&product.ID, &product.Name, &product.Description, &product.Price, &product.Stock, &product.Category, &product.CreatedAt, &product.UpdatedAt)

	if err == sql.ErrNoRows {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	} else if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Cache for 5 minutes
	productJSON, _ := json.Marshal(product)
	h.Redis.Set(ctx, cacheKey, productJSON, 5*time.Minute)

	ctx.Header("X-Cache", "MISS")
	ctx.JSON(http.StatusOK, product)
}

// UpdateProduct updates a product
func (h *ProductHandler) UpdateProduct(ctx *gin.Context) {
	productID := ctx.Param("id")

	var req models.ProductUpdateRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build dynamic update query
	query := "UPDATE products SET updated_at = $1"
	args := []any{time.Now()}
	argPos := 2

	if req.Name != nil {
		query += fmt.Sprintf(", name = $%d", argPos)
		args = append(args, *req.Name)
		argPos++
	}
	if req.Description != nil {
		query += fmt.Sprintf(", description = $%d", argPos)
		args = append(args, *req.Description)
		argPos++
	}
	if req.Price != nil {
		query += fmt.Sprintf(", price = $%d", argPos)
		args = append(args, *req.Price)
		argPos++
	}
	if req.Stock != nil {
		query += fmt.Sprintf(", stock = $%d", argPos)
		args = append(args, *req.Stock)
		argPos++
	}
	if req.Category != nil {
		query += fmt.Sprintf(", category = $%d", argPos)
		args = append(args, *req.Category)
		argPos++
	}

	query += fmt.Sprintf(" WHERE id = $%d", argPos)
	args = append(args, productID)

	result, err := h.DB.Exec(query, args...)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Invalidate cache
	h.Redis.Del(ctx, fmt.Sprintf("product:%s", productID))
	h.Redis.Del(ctx, "products:all")

	ctx.JSON(http.StatusOK, gin.H{"message": "Product updated successfully"})
}

// DeleteProduct deletes a product
func (h *ProductHandler) DeleteProduct(ctx *gin.Context) {
	productID := ctx.Param("id")

	result, err := h.DB.ExecContext(ctx, "DELETE FROM products WHERE id = $1", productID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Invalidate cache
	h.Redis.Del(ctx, fmt.Sprintf("product:%s", productID))
	h.Redis.Del(ctx, "products:all")

	ctx.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

// HealthCheck endpoint
func (h *ProductHandler) HealthCheck(ctx *gin.Context) {
	// Check database
	dbErr := h.DB.Ping()

	// Check Redis
	redisErr := h.Redis.Ping(ctx).Err()

	if dbErr != nil || redisErr != nil {
		ctx.JSON(http.StatusServiceUnavailable, gin.H{
			"status":   "unhealthy",
			"database": dbErr == nil,
			"redis":    redisErr == nil,
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status":   "healthy",
		"service":  "product-service",
		"database": "connected",
		"redis":    "connected",
	})
}
