import React, { useState, useEffect } from 'react';
import { orderAPI } from '../services/api';
import './Orders.css';

function Orders({ userId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await orderAPI.getUserOrders(userId);
        setOrders(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load orders');
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId]);

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ffa500',
      processing: '#2196f3',
      shipped: '#9c27b0',
      delivered: '#4caf50',
      cancelled: '#f44336',
    };
    return colors[status] || '#666';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="orders-empty">
        <h2>No Orders Yet</h2>
        <p>You haven't placed any orders yet.</p>
        <a href="/products" className="btn-primary">
          Start Shopping
        </a>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <h2>My Orders</h2>
      
      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-header">
              <div className="order-info">
                <h3>Order #{order.id}</h3>
                <p className="order-date">{formatDate(order.created_at)}</p>
              </div>
              <div
                className="order-status"
                style={{ backgroundColor: getStatusColor(order.status) }}
              >
                {order.status.toUpperCase()}
              </div>
            </div>
            
            <div className="order-items">
              <h4>Items:</h4>
              {order.items.map((item, index) => (
                <div key={index} className="order-item">
                  <span className="item-name">{item.product_name}</span>
                  <span className="item-quantity">Qty: {item.quantity}</span>
                  <span className="item-price">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            <div className="order-total">
              <strong>Total: ${parseFloat(order.total_amount).toFixed(2)}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Orders;