class Order {
  constructor(id, userId, items, totalAmount, status, createdAt, updatedAt) {
    this.id = id;
    this.userId = userId;
    this.items = items;
    this.totalAmount = totalAmount;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

class OrderItem {
  constructor(productId, productName, quantity, price) {
    this.productId = productId;
    this.productName = productName;
    this.quantity = quantity;
    this.price = price;
  }
}

module.exports = { Order, OrderItem };
