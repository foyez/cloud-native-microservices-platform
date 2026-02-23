import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../services/api';
import './Cart.css';

function Cart({ cart, onUpdateQuantity, onRemove, onClear, userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orderData = {
        userId: userId,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      };

      await orderAPI.create(orderData);
      
      onClear();
      alert('Order placed successfully!');
      navigate('/orders');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <h2>Your Cart is Empty</h2>
        <p>Add some products to your cart to get started!</p>
        <a href="/products" className="btn-primary">
          Continue Shopping
        </a>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <h2>Shopping Cart</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="cart-items">
        {cart.map((item) => (
          <div key={item.id} className="cart-item">
            <div className="cart-item-info">
              <h3>{item.name}</h3>
              <p className="cart-item-price">${item.price.toFixed(2)}</p>
            </div>
            
            <div className="cart-item-controls">
              <div className="quantity-controls">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  -
                </button>
                <span className="quantity">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  disabled={item.quantity >= item.stock}
                >
                  +
                </button>
              </div>
              
              <div className="cart-item-total">
                ${(item.price * item.quantity).toFixed(2)}
              </div>
              
              <button
                className="remove-btn"
                onClick={() => onRemove(item.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="cart-summary">
        <div className="cart-total">
          <h3>Total: ${calculateTotal().toFixed(2)}</h3>
        </div>
        
        <div className="cart-actions">
          <button className="btn-secondary" onClick={onClear}>
            Clear Cart
          </button>
          <button
            className="btn-primary"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Cart;