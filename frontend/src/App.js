import React, { useState, useEffect } from 'react';
import { ShoppingCart, Clock, Package, AlertCircle, Trash2, Plus, Minus, ArrowLeft, CheckCircle, History, Loader } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

const CanteenOrderingSystem = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState('menu');
  const [orderTimer, setOrderTimer] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(900);
  const [orderDetails, setOrderDetails] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create or get user on mount
  useEffect(() => {
    initializeUser();
    fetchMenuItems();
    fetchOrders();
  }, []);

  // Countdown timer for order
  useEffect(() => {
    if (orderTimer && orderDetails?.status === 'pending') {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleOrderTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [orderTimer, orderDetails]);

  // Auto-refresh menu items every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMenuItems();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeUser = async () => {
    // Check if user exists in localStorage
    let user = JSON.parse(localStorage.getItem('canteen_user'));
    
    if (!user) {
      // Create a new user
      try {
        const response = await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `User_${Date.now()}`,
            email: `user${Date.now()}@canteen.com`,
            phone: `${Math.floor(1000000000 + Math.random() * 9000000000)}`
          })
        });
        
        const data = await response.json();
        if (data.success) {
          user = data.data;
          localStorage.setItem('canteen_user', JSON.stringify(user));
        }
      } catch (err) {
        console.error('Failed to create user:', err);
        setError('Failed to initialize user. Please refresh the page.');
        return;
      }
    }
    
    setCurrentUser(user);
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/menu/available`);
      const data = await response.json();
      
      if (data.success) {
        // Transform API data to match frontend format
        const transformedItems = data.data.map(item => ({
          id: item._id,
          name: item.name,
          price: item.price,
          stock: item.stock_count,
          description: item.description || '',
          category: 'All',
          image: getEmojiForItem(item.name)
        }));
        setMenuItems(transformedItems);
      }
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
    }
  };

  const fetchOrders = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/orders/user/${currentUser._id}`);
      const data = await response.json();
      
      if (data.success) {
        const completedOrders = data.data
          .filter(order => order.status === 'completed')
          .map(order => ({
            orderId: order._id,
            items: order.items.map(item => ({
              id: item.menu_item_id,
              name: item.menu_item_name,
              quantity: item.quantity,
              price: item.price,
              image: getEmojiForItem(item.menu_item_name)
            })),
            total: order.total_amount,
            paymentMethod: 'Completed',
            timestamp: new Date(order.payment_completed_at || order.createdAt),
            status: order.status
          }));
        setOrderHistory(completedOrders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const getEmojiForItem = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('burger')) return '🍔';
    if (lowerName.includes('sandwich') || lowerName.includes('wrap')) return '🥪';
    if (lowerName.includes('pizza')) return '🍕';
    if (lowerName.includes('fries')) return '🍟';
    if (lowerName.includes('salad')) return '🥗';
    if (lowerName.includes('coffee') || lowerName.includes('tea')) return '☕';
    if (lowerName.includes('shake') || lowerName.includes('juice')) return '🥤';
    if (lowerName.includes('paneer')) return '🌯';
    return '🍽️';
  };

  const categories = ['All', ...new Set(menuItems.map(item => item.category))];

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const addToCart = (item) => {
    if (item.stock === 0) {
      setError('Item out of stock!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem && existingItem.quantity >= item.stock) {
      setError('Cannot add more items than available stock!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, change) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return item;
        if (newQuantity > item.stock) {
          setError('Cannot exceed available stock!');
          setTimeout(() => setError(null), 3000);
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const proceedToCheckout = async () => {
    if (cart.length === 0) {
      setError('Your cart is empty!');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!currentUser) {
      setError('User not initialized. Please refresh the page.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setLoading(true);

    try {
      const orderPayload = {
        user_id: currentUser._id,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity
        }))
      };

      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json();

      if (data.success) {
        // Order created successfully
        setOrderDetails({
          ...data.data,
          items: cart,
          status: 'pending'
        });
        
        // Calculate time remaining from auto_cancel_at
        const autoCancelTime = new Date(data.data.auto_cancel_at).getTime();
        const now = Date.now();
        const remainingSeconds = Math.max(0, Math.floor((autoCancelTime - now) / 1000));
        
        setTimeRemaining(remainingSeconds);
        setOrderTimer(Date.now());
        setCurrentPage('checkout');
        
        // Refresh menu to show updated stock
        await fetchMenuItems();
      } else {
        setError(data.message || 'Failed to create order');
        setTimeout(() => setError(null), 3000);
      }
    } catch (err) {
      console.error('Failed to create order:', err);
      setError('Failed to create order. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderTimeout = async () => {
    if (!orderDetails) return;

    // Cancel order via API
    try {
      await fetch(`${API_BASE_URL}/orders/${orderDetails._id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to cancel order:', err);
    }

    // Reset state
    setCart([]);
    setOrderTimer(null);
    setOrderDetails(null);
    setCurrentPage('menu');
    setError('Order cancelled! Stock has been restored. Please try again.');
    setTimeout(() => setError(null), 5000);
    
    // Refresh menu
    await fetchMenuItems();
  };

  const cancelOrder = async () => {
    if (window.confirm('Are you sure you want to cancel this order? Stock will be restored.')) {
      await handleOrderTimeout();
    }
  };

  const confirmPayment = async (method) => {
    if (!orderDetails) return;

    setLoading(true);

    try {
      // Complete payment
      const paymentResponse = await fetch(`${API_BASE_URL}/orders/${orderDetails._id}/payment`, {
        method: 'PATCH'
      });

      const paymentData = await paymentResponse.json();

      if (paymentData.success) {
        // Complete pickup
        const pickupResponse = await fetch(`${API_BASE_URL}/orders/${orderDetails._id}/pickup`, {
          method: 'PATCH'
        });

        const pickupData = await pickupResponse.json();

        if (pickupData.success) {
          setOrderDetails({
            ...pickupData.data,
            items: cart,
            paymentMethod: method
          });
          setCart([]);
          setOrderTimer(null);
          setCurrentPage('order-confirmed');
          
          // Refresh orders
          await fetchOrders();
        }
      }
    } catch (err) {
      console.error('Failed to complete payment:', err);
      setError('Failed to complete payment. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const backToMenu = () => {
    setCurrentPage('menu');
    setOrderDetails(null);
  };

  const viewOrderHistory = () => {
    setCurrentPage('order-history');
  };

  const reorderItems = async (order) => {
    // Fetch fresh menu data
    await fetchMenuItems();
    
    const availableItems = order.items.filter(orderItem => {
      const menuItem = menuItems.find(m => m.name === orderItem.name);
      return menuItem && menuItem.stock >= orderItem.quantity;
    });

    if (availableItems.length === 0) {
      setError('Sorry, none of these items are currently available with sufficient stock.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (availableItems.length < order.items.length) {
      setError(`Only ${availableItems.length} out of ${order.items.length} items are available.`);
      setTimeout(() => setError(null), 3000);
    }

    const newCart = [...cart];
    availableItems.forEach(orderItem => {
      const menuItem = menuItems.find(m => m.name === orderItem.name);
      if (!menuItem) return;
      
      const existingCartItem = newCart.find(c => c.id === menuItem.id);
      
      if (existingCartItem) {
        const totalQuantity = existingCartItem.quantity + orderItem.quantity;
        existingCartItem.quantity = Math.min(totalQuantity, menuItem.stock);
      } else {
        newCart.push({ ...menuItem, quantity: orderItem.quantity });
      }
    });

    setCart(newCart);
    setCurrentPage('menu');
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { text: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-100' };
    if (stock <= 5) return { text: `Only ${stock} left!`, color: 'text-orange-600', bg: 'bg-orange-100' };
    return { text: `${stock} available`, color: 'text-green-600', bg: 'bg-green-100' };
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Error notification
  const ErrorNotification = () => error && (
    <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    </div>
  );

  // Loading overlay
  const LoadingOverlay = () => loading && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4">
        <Loader className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-gray-700 font-semibold">Processing...</p>
      </div>
    </div>
  );

  // Order History Page
  if (currentPage === 'order-history') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <ErrorNotification />
        <header className="bg-white shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={backToMenu}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-semibold">Back to Menu</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Order History</h1>
              <div className="w-24"></div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {orderHistory.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <History className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">No Orders Yet</h2>
              <p className="text-gray-600 mb-6">Your order history will appear here</p>
              <button
                onClick={backToMenu}
                className="bg-orange-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-600 transition"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orderHistory.map((order) => (
                <div key={order.orderId} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm opacity-90">Order ID</p>
                        <p className="font-mono font-bold text-sm">{order.orderId.slice(-8)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm opacity-90">Date</p>
                        <p className="font-semibold">{order.timestamp.toLocaleDateString()}</p>
                        <p className="text-xs opacity-75">{order.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-3">Items Ordered:</h3>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{item.image}</span>
                            <div>
                              <p className="font-medium text-gray-800">{item.name}</p>
                              <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <p className="font-semibold text-gray-800">₹{item.price * item.quantity}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between py-4 border-t-2 border-gray-200 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 text-right">Total Amount</p>
                        <p className="text-2xl font-bold text-orange-600">₹{order.total}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => reorderItems(order)}
                        className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Reorder
                      </button>
                      <div className="flex items-center gap-2 px-4 py-3 bg-green-100 rounded-xl">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-semibold text-green-700">Completed</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Order Confirmation Page
  if (currentPage === 'order-confirmed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <ErrorNotification />
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-6">Your order has been placed successfully</p>
          
          <div className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">Order ID</span>
              <span className="font-mono font-semibold text-gray-800">{orderDetails?._id?.slice(-8)}</span>
            </div>
            
            <div className="border-t border-gray-200 pt-4 mb-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Items:</p>
              {orderDetails?.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{item.name} x {item.quantity}</span>
                  <span className="font-semibold text-gray-800">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Payment Method</span>
                <span className="font-semibold text-gray-800">{orderDetails?.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Total Amount</span>
                <span className="text-2xl font-bold text-green-600">₹{orderDetails?.total_amount}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={backToMenu}
            className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold hover:bg-orange-600 transition"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // Checkout Page
  if (currentPage === 'checkout') {
    const timerPercentage = (timeRemaining / 900) * 100;
    const isUrgent = timeRemaining <= 300;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <ErrorNotification />
        <LoadingOverlay />
        <header className="bg-white shadow-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={cancelOrder}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-semibold">Cancel Order</span>
              </button>
              
              <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${
                isUrgent ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />
                <div>
                  <p className="text-xs text-gray-600">Time Remaining</p>
                  <p className={`text-xl font-bold ${isUrgent ? 'text-red-600' : 'text-blue-600'}`}>
                    {formatTime(timeRemaining)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  isUrgent ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${timerPercentage}%` }}
              />
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Complete Your Order</h1>

          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h2>
            
            {cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 py-4 border-b border-gray-200 last:border-0">
                <div className="text-4xl">{item.image}</div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-600">₹{item.price} each</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-gray-800 w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-right min-w-24">
                  <p className="font-bold text-gray-800">₹{item.price * item.quantity}</p>
                </div>
                
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:text-red-700 transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}

            <div className="mt-6 pt-6 border-t-2 border-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-xl font-semibold text-gray-700">Total Amount</span>
                <span className="text-3xl font-bold text-orange-600">₹{cartTotal}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Select Payment Method</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => confirmPayment('Cash')}
                disabled={loading}
                className="p-6 border-2 border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition text-left group disabled:opacity-50"
              >
                <div className="text-4xl mb-2">💵</div>
                <h3 className="font-bold text-gray-800 group-hover:text-orange-600">Cash</h3>
                <p className="text-sm text-gray-600">Pay at the counter</p>
              </button>

              <button
                onClick={() => confirmPayment('UPI')}
                disabled={loading}
                className="p-6 border-2 border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition text-left group disabled:opacity-50"
              >
                <div className="text-4xl mb-2">📱</div>
                <h3 className="font-bold text-gray-800 group-hover:text-orange-600">UPI</h3>
                <p className="text-sm text-gray-600">PhonePe, GPay, Paytm</p>
              </button>

              <button
                onClick={() => confirmPayment('Card')}
                disabled={loading}
                className="p-6 border-2 border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition text-left group disabled:opacity-50"
              >
                <div className="text-4xl mb-2">💳</div>
                <h3 className="font-bold text-gray-800 group-hover:text-orange-600">Card</h3>
                <p className="text-sm text-gray-600">Debit/Credit Card</p>
              </button>

              <button
                onClick={() => confirmPayment('Wallet')}
                disabled={loading}
                className="p-6 border-2 border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition text-left group disabled:opacity-50"
              >
                <div className="text-4xl mb-2">👛</div>
                <h3 className="font-bold text-gray-800 group-hover:text-orange-600">Wallet</h3>
                <p className="text-sm text-gray-600">Digital wallet</p>
              </button>
            </div>
          </div>

          <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${
            isUrgent ? 'bg-red-100 border-l-4 border-red-500' : 'bg-yellow-100 border-l-4 border-yellow-500'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              isUrgent ? 'text-red-600' : 'text-yellow-600'
            }`} />
            <div>
              <p className={`font-semibold ${isUrgent ? 'text-red-900' : 'text-yellow-900'}`}>
                {isUrgent ? 'Hurry! Your order will expire soon!' : 'Complete payment to confirm order'}
              </p>
              <p className={`text-sm ${isUrgent ? 'text-red-700' : 'text-yellow-700'}`}>
                Stock is locked for {formatTime(timeRemaining)}. Complete payment or your order will be auto-cancelled.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Menu Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <ErrorNotification />
      <LoadingOverlay />
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-orange-600">Canteen Express</h1>
              <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                <Clock className="w-4 h-4" />
                {currentUser ? `User: ${currentUser.name}` : 'Loading...'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={viewOrderHistory}
                className="bg-white border-2 border-orange-500 text-orange-600 px-4 py-2 rounded-full flex items-center gap-2 hover:bg-orange-50 transition"
              >
                <History className="w-5 h-5" />
                <span className="font-semibold hidden sm:inline">History</span>
              </button>
              <div className="relative">
                <button className="bg-orange-500 text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-orange-600 transition">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="font-semibold">Cart ({cart.length})</span>
                </button>
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition ${
                selectedCategory === category
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-orange-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        {menuItems.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
            <Loader className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Menu...</h2>
            <p className="text-gray-600">Please wait while we fetch available items</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(item => {
              const stockStatus = getStockStatus(item.stock);
              const cartItem = cart.find(c => c.id === item.id);
              
              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl shadow-lg overflow-hidden transform transition hover:scale-105 ${
                    item.stock === 0 ? 'opacity-60' : ''
                  }`}
                >
                  <div className="bg-gradient-to-br from-orange-100 to-red-100 h-48 flex items-center justify-center text-7xl">
                    {item.image}
                  </div>

                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mb-3">
                      <span className="text-2xl font-bold text-orange-600">₹{item.price}</span>
                    </div>

                    <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg ${stockStatus.bg}`}>
                      <Package className={`w-4 h-4 ${stockStatus.color}`} />
                      <span className={`text-sm font-semibold ${stockStatus.color}`}>
                        {stockStatus.text}
                      </span>
                    </div>

                    <button
                      onClick={() => addToCart(item)}
                      disabled={item.stock === 0}
                      className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${
                        item.stock === 0
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:shadow-lg'
                      }`}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {cartItem ? `In Cart (${cartItem.quantity})` : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-2xl border-t-4 border-orange-500">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items in cart
                </p>
                <p className="text-2xl font-bold text-gray-800">Total: ₹{cartTotal}</p>
              </div>
              <button 
                onClick={proceedToCheckout}
                disabled={loading}
                className="bg-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition shadow-lg disabled:opacity-50"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanteenOrderingSystem;