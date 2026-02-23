const express = require("express");
const { Client } = require("pg");
const redis = require("redis");
require("dotenv").config();

const orderRoutes = require("./routes/orders");

const app = express();
const PORT = process.env.PORT || 8082;

// Middleware
app.use(express.json());

// Database connection
const ssl =
  process.env.SSLMODE === "require" ? { rejectUnauthorized: false } : false;
const dbClient = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl,
});

dbClient
  .connect()
  .then(() => {
    console.log("Connected to PostgreSQL database");
    return createTables();
  })
  .catch((err) => {
    console.error("Database connection error:", err);
    process.exit(1);
  });

// Redis connection
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
  },
});

redisClient
  .connect()
  .then(() => console.log("Connected to Redis"))
  .catch((err) => console.error("Redis connection error:", err));

// Make clients available to routes
app.locals.dbClient = dbClient;
app.locals.redisClient = redisClient;

// Create tables
async function createTables() {
  const createOrdersTable = `
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  `;

  const createOrderItemsTable = `
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL,
      product_name VARCHAR(100) NOT NULL,
      quantity INTEGER NOT NULL,
      price DECIMAL(10, 2) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  `;

  await dbClient.query(createOrdersTable);
  await dbClient.query(createOrderItemsTable);
  console.log("Database tables created/verified");
}

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    await dbClient.query("SELECT 1");
    await redisClient.ping();

    res.json({
      status: "healthy",
      service: "order-service",
      database: "connected",
      redis: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      error: error.message,
    });
  }
});

// API routes
app.use("/api/v1/orders", orderRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing connections...");
  await dbClient.end();
  await redisClient.quit();
  process.exit(0);
});
