const express = require("express");
const axios = require("axios");
const router = express.Router();
const { isAuth } = require("../middleware/auth");

// Service URLs
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://user-service:8080";
const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://product-service:8081";
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || "http://order-service:8082";

// Proxy helper function
async function proxyRequest(serviceUrl, path, method, data, headers) {
  try {
    const res = await axios({
      method,
      url: `${serviceUrl}${path}`,
      data,
      headers,
    });
    return res;
  } catch (err) {
    if (err.response) {
      throw err.response;
    }
    throw err;
  }
}

// User Service Routes (Public)
router.post("/users", async (req, res) => {
  try {
    const response = await proxyRequest(
      USER_SERVICE_URL,
      "/api/v1/users",
      "POST",
      req.body,
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    res
      .status(err.status || 500)
      .json(err.data || { error: "Service unavailable" });
  }
});

router.post("/users/login", async (req, res) => {
  try {
    const response = await proxyRequest(
      USER_SERVICE_URL,
      "/api/v1/users/login",
      "POST",
      req.body,
    );
    res.status(response.status).json(response.data);
  } catch (err) {
    res
      .status(err.status || 500)
      .json(err.data || { error: "Service unavailable" });
  }
});

// User Service Routes (Protected)
router.get("/users/:id", isAuth, async (req, res) => {
  try {
    const response = await proxyRequest(
      USER_SERVICE_URL,
      `/api/v1/users/${req.params.id}`,
      "GET",
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res
      .status(error.status || 500)
      .json(error.data || { error: "Service unavailable" });
  }
});

// Products Service Routes (Public read, Protected write)
router.get("/products", async (req, res) => {
  try {
    const response = await proxyRequest(
      PRODUCT_SERVICE_URL,
      "/api/v1/products",
      "GET",
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res
      .status(error.status || 500)
      .json(error.data || { error: "Service unavailable" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const response = await proxyRequest(
      PRODUCT_SERVICE_URL,
      `/api/v1/products/${req.params.id}`,
      "GET",
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res
      .status(error.status || 500)
      .json(error.data || { error: "Service unavailable" });
  }
});

router.post("/products", isAuth, async (req, res) => {
  try {
    const response = await proxyRequest(
      PRODUCT_SERVICE_URL,
      "/api/v1/products",
      "POST",
      req.body,
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res
      .status(error.status || 500)
      .json(error.data || { error: "Service unavailable" });
  }
});

router.put("/products/:id", isAuth, async (req, res) => {
  try {
    const response = await proxyRequest(
      PRODUCT_SERVICE_URL,
      `/api/v1/products/${req.params.id}`,
      "PUT",
      req.body,
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res
      .status(error.status || 500)
      .json(error.data || { error: "Service unavailable" });
  }
});

router.delete("/products/:id", isAuth, async (req, res) => {
  try {
    const response = await proxyRequest(
      PRODUCT_SERVICE_URL,
      `/api/v1/products/${req.params.id}`,
      "DELETE",
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res
      .status(error.status || 500)
      .json(error.data || { error: "Service unavailable" });
  }
});

// Order Service Routes (All protected)
router.post("/orders", isAuth, async (req, res) => {
  try {
    const response = await proxyRequest(
      ORDER_SERVICE_URL,
      "/api/v1/orders",
      "POST",
      req.body,
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res
      .status(error.status || 500)
      .json(error.data || { error: "Service unavailable" });
  }
});

router.get("/users/:userId/orders", isAuth, async (req, res) => {
  try {
    const response = await proxyRequest(
      ORDER_SERVICE_URL,
      `/api/v1/orders/users/${req.params.userId}`,
      "GET",
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res
      .status(error.status || 500)
      .json(error.data || { error: "Service unavailable" });
  }
});

router.get("/orders/:id", isAuth, async (req, res) => {
  try {
    const response = await proxyRequest(
      ORDER_SERVICE_URL,
      `/api/v1/orders/${req.params.id}`,
      "GET",
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res
      .status(error.status || 500)
      .json(error.data || { error: "Service unavailable" });
  }
});

router.patch("/orders/:id/status", isAuth, async (req, res) => {
  try {
    const response = await proxyRequest(
      ORDER_SERVICE_URL,
      `/api/v1/orders/${req.params.id}/status`,
      "PATCH",
      req.body,
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    res
      .status(error.status || 500)
      .json(error.data || { error: "Service unavailable" });
  }
});

module.exports = router;
