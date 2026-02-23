import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, NavLink } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ProductList from './components/ProductList';
import Cart from './components/Cart';
import Orders from './components/Orders';
import './App.css';

function App() {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [cart, setCart] = useState([]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCart([]);
  };

  const handleAddToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const handleUpdateQuantity = (productId, quantity) => {
    if (quantity === 0) {
      handleRemoveFromCart(productId);
    } else {
      setCart(
        cart.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const handleClearCart = () => {
    setCart([]);
  };

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>Microservices Shop</h1>
          </div>
          <div className="nav-links">
            {user ? (
              <>
                <span>Welcome, {user.username}!</span>
                <NavLink to="/products">Products</NavLink>
                <NavLink to="/orders">My Orders</NavLink>
                <NavLink to="/cart">Cart ({cart.length})</NavLink>
                <button onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <NavLink to="/login">Login</NavLink>
                <NavLink to="/register">Register</NavLink>
              </>
            )}
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route
              path="/login"
              element={
                user ? <Navigate to="/products" /> : <Login onLogin={handleLogin} />
              }
            />
            <Route
              path="/register"
              element={
                user ? <Navigate to="/products" /> : <Register onLogin={handleLogin} />
              }
            />
            <Route
              path="/products"
              element={
                user ? (
                  <ProductList onAddToCart={handleAddToCart} />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/cart"
              element={
                user ? (
                  <Cart
                    cart={cart}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemoveFromCart}
                    onClear={handleClearCart}
                    userId={user.id}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/orders"
              element={
                user ? <Orders userId={user.id} /> : <Navigate to="/login" />
              }
            />
            <Route path="/" element={<Navigate to="/products" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;