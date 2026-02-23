package handlers

import (
	"database/sql"
	"net/http"
	"os"
	"time"

	"github.com/foyez/eks-microservices/microservices/user-service/models"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	DB *sql.DB
}

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

// CreateUser handles user registration
func (h *UserHandler) CreateUser(ctx *gin.Context) {
	var req models.UserCreateRequest

	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Insert user into database
	var userID int
	err = h.DB.QueryRowContext(ctx,
		"INSERT INTO users (username, email, password, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		req.Username, req.Email, string(hashedPassword), time.Now(), time.Now()).Scan(&userID)

	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	ctx.JSON(http.StatusCreated, models.UserResponse{
		ID:       userID,
		Username: req.Username,
		Email:    req.Email,
	})
}

// Login handles user authentication
func (h *UserHandler) Login(c *gin.Context) {
	var req models.UserLoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user from database
	var user models.User
	err := h.DB.QueryRow(
		"SELECT id, username, email, password FROM users WHERE email = $1",
		req.Email,
	).Scan(&user.ID, &user.Username, &user.Email, &user.Password)

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, models.UserResponse{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
		Token:    tokenString,
	})
}

// GetUser retrieves user by ID
func (h *UserHandler) GetUser(ctx *gin.Context) {
	userID := ctx.Param("id")

	var user models.User
	err := h.DB.QueryRowContext(ctx,
		"SELECT id, username, email, created_at FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt)

	if err == sql.ErrNoRows {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	} else if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	ctx.JSON(http.StatusOK, user)
}

// HealthCheck endpoint
func (h *UserHandler) HealthCheck(ctx *gin.Context) {
	// Check database connection
	err := h.DB.Ping()
	if err != nil {
		ctx.JSON(http.StatusServiceUnavailable, gin.H{
			"status":   "unhealthy",
			"database": "disconnected",
		})
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"status":   "healthy",
		"service":  "user-service",
		"database": "connected",
	})
}
