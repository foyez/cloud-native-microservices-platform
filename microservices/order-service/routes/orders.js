const express = require("express");
const axios = require("axios");
const router = express.Router();

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://product-service:8081";

// Create order
router.post("/", async (req, res) => {
  const { userId, items } = req.body;

  const redisClient = req.app.locals.redisClient;

  if (!userId || !items || items.length === 0) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  const client = req.app.locals.dbClient;

  try {
    await client.query("BEGIN");

    // Validate products and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      // Get product details from product service
      const productResponse = await axios.get(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${item.productId}`,
      );

      const product = productResponse.data;

      if (product.stock < item.quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Insufficient stock for product ${product.name}`,
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, status, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id`,
      [userId, totalAmount, "pending"],
    );

    const orderId = orderResult.rows[0].id;

    // Insert order items
    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price) 
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.productId, item.productName, item.quantity, item.price],
      );
    }

    await client.query("COMMIT");

    await redisClient.del(`orders:user:${userId}`);
    await redisClient.del("orders:all");
    res.status(201).json({
      id: orderId,
      userId,
      items: orderItems,
      totalAmount,
      status: "pending",
      message: "Order created successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Order creation error: ", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Get all orders for a user
router.get("/users/:userId", async (req, res) => {
  const { userId } = req.params;
  const client = req.app.locals.dbClient;
  const redisClient = req.app.locals.redisClient;
  const cacheKey = `orders:user:${userId}`;

  const cached = await redisClient.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  try {
    const result = await client.query(
      `SELECT o.id, o.user_id, o.total_amount, o.status, o.created_at, o.updated_at,
              json_agg(json_build_object(
                'productId', oi.product_id,
                'productName', oi.product_name,
                'quantity', oi.quantity,
                'price', oi.price
              )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId],
    );
    const orders = result.rows;

    await redisClient.set(cacheKey, JSON.stringify(orders), { EX: 300 });
    res.json(orders);
  } catch (err) {
    console.log("Get order error:", err);
    res.status(500).json({ error: "Failed to retrieve orders" });
  }
});

// Get order by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const client = req.app.locals.dbClient;
  const redisClient = req.app.locals.redisClient;
  const cacheKey = `order:${id}`;

  const cached = await redisClient.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  try {
    const result = await client.query(
      `SELECT o.id, o.user_id, o.total_amount, o.status, o.created_at, o.updated_at,
              json_agg(json_build_object(
                'productId', oi.product_id,
                'productName', oi.product_name,
                'quantity', oi.quantity,
                'price', oi.price
              )) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = result.rows[0];
    await redisClient.set(cacheKey, JSON.stringify(order), { EX: 300 });
    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ error: "Failed to retrieve order" });
  }
});

// Update order status
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const redisClient = req.app.locals.redisClient;
  const userId = 1;

  const validStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const client = req.app.locals.dbClient;

  try {
    const result = await client.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    await redisClient.del(`order:${id}`);
    await redisClient.del(`orders:user:${userId}`);
    await redisClient.del("orders:all");

    res.json({
      message: "Order status updated",
      order: result.rows[0],
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

module.exports = router;
