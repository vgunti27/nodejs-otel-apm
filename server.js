// Initialize OpenTelemetry tracing FIRST
require('./tracing');

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const { trace, context } = require('@opentelemetry/api');

const app = express();
const tracer = trace.getTracer('demo-ecom-app', '1.0.0');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'ecommerce-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60000 * 60 } // 60 minutes
}));

// OpenTelemetry middleware - propagate trace context across user session
app.use((req, res, next) => {
  let traceId, spanId, isNewTransaction = false;
  
  // For authenticated session - reuse trace_id from session
  if (req.session && req.session.traceId) {
    // Continue existing transaction - reuse trace_id
    traceId = req.session.traceId;
    
    // Create a new child span under the same trace
    const span = tracer.startSpan(`${req.method} ${req.path}`);
    spanId = span.spanContext().spanId;
    req.span = span;
    console.log('Span created for existing session:', span.spanContext());
  } else {
    // New transaction - start root span and initialize session trace
    isNewTransaction = true;
    const span = tracer.startSpan(`${req.method} ${req.path}`, {
      attributes: {
        'transaction.type': 'session-start',
      }
    });
    
    const sc = span.spanContext();
    traceId = sc.traceId;
    spanId = sc.spanId;
    req.span = span;
    console.log('Span created for new session:', span.spanContext());
    
    // Store trace_id in session for subsequent requests
    if (req.session) {
      req.session.traceId = traceId;
    }
  }
  
  // Set span attributes
  if (req.span) {
    req.span.setAttributes({
      'http.method': req.method,
      'http.url': req.url,
      'http.target': req.path,
      'http.host': req.hostname,
      'http.scheme': req.protocol,
      'http.client_ip': req.ip,
      'transaction.new': isNewTransaction,
      'session.id': req.sessionID || 'none',
    });
  }
  
  // Store trace context in request
  req.traceContext = {
    traceId: traceId,
    spanId: spanId,
    isNewTransaction: isNewTransaction,
  };
  
  // Set trace context in AsyncLocalStorage so logger can access it
  logger.setTraceContext(traceId, spanId);
  
  // End span when response is sent
  const originalEnd = res.end;
  res.end = function(...args) {
    if (req.span) {
      req.span.setAttributes({
        'http.status_code': res.statusCode,
      });
      req.span.end();
    }
    return originalEnd.apply(res, args);
  };
  
  // Call next with the span context
  const spanContext = req.span ? trace.setSpan(context.active(), req.span) : context.active();
  context.with(spanContext, next);
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// In-memory database
const store = {
  products: [
    { id: 1, name: 'Laptop', price: 1200, description: 'High-performance laptop', image: 'laptop.jpg' },
    { id: 2, name: 'Smartphone', price: 800, description: 'Latest smartphone model', image: 'phone.jpg' },
    { id: 3, name: 'Headphones', price: 150, description: 'Wireless headphones', image: 'headphones.jpg' },
    { id: 4, name: 'Monitor', price: 400, description: '4K Ultra HD monitor', image: 'monitor.jpg' },
    { id: 5, name: 'Keyboard', price: 100, description: 'Mechanical gaming keyboard', image: 'keyboard.jpg' },
    { id: 6, name: 'Mouse', price: 50, description: 'Ergonomic wireless mouse', image: 'mouse.jpg' }
  ],
  orders: []
};

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/products');
  } else {
    res.redirect('/login');
  }
});

// Login page
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Handle login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const srcIp = req.ip;
  
  if (username === 'admin' && password === 'admin') {
    req.session.user = { username: 'admin' };
    req.session.cart = [];
    logger.success('User logged in successfully', 'admin', srcIp, { attemptedUsername: username });
    res.redirect('/products');
  } else {
    logger.warn('Failed login attempt', 'system', srcIp, { attemptedUsername: username });
    res.render('login', { error: 'Invalid credentials' });
  }
});

// Logout
app.get('/logout', (req, res) => {
  const username = req.session.user?.username || 'unknown';
  const srcIp = req.ip;
  logger.action('LOGOUT', username, srcIp, { timestamp: new Date().toISOString() });
  req.session.destroy();
  res.redirect('/login');
});

// Products page
app.get('/products', isAuthenticated, (req, res) => {
  const username = req.session.user?.username || 'unknown';
  const srcIp = req.ip;
  logger.action('VIEWED_PRODUCTS', username, srcIp, { cartItems: (req.session.cart || []).length });
  res.render('products', { products: store.products, cart: req.session.cart || [] });
});

// Add to cart
app.post('/add-to-cart', isAuthenticated, (req, res) => {
  const { productId } = req.body;
  if (!req.session.cart) {
    req.session.cart = [];
  }
  
  const product = store.products.find(p => p.id === parseInt(productId));
  if (product) {
    const cartItem = req.session.cart.find(item => item.id === product.id);
    if (cartItem) {
      cartItem.quantity++;
    } else {
      req.session.cart.push({ ...product, quantity: 1 });
    }
    const username = req.session.user?.username || 'unknown';
    const srcIp = req.ip;
    logger.action('ADDED_TO_CART', username, srcIp, { 
      productId: product.id, 
      productName: product.name, 
      price: product.price,
      cartSize: req.session.cart.length 
    });
  }
  
  res.redirect('/products');
});

// View cart
app.get('/cart', isAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const username = req.session.user?.username || 'unknown';
  const srcIp = req.ip;
  logger.action('VIEWED_CART', username, srcIp, { cartItems: cart.length, total: total.toFixed(2) });
  res.render('cart', { cart, total });
});

// Remove from cart
app.post('/remove-from-cart', isAuthenticated, (req, res) => {
  const { productId } = req.body;
  if (req.session.cart) {
    const removedItem = req.session.cart.find(item => item.id === parseInt(productId));
    req.session.cart = req.session.cart.filter(item => item.id !== parseInt(productId));
    
    const username = req.session.user?.username || 'unknown';
    const srcIp = req.ip;
    logger.action('REMOVED_FROM_CART', username, srcIp, { 
      productId: parseInt(productId),
      productName: removedItem?.name || 'unknown',
      cartSize: req.session.cart.length
    });
  }
  res.redirect('/cart');
});

// Shipping page
app.get('/shipping', isAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const username = req.session.user?.username || 'unknown';
  const srcIp = req.ip;
  logger.action('VIEWED_SHIPPING', username, srcIp, { itemsInCart: cart.length });
  res.render('shipping', { cart, total });
});

// Handle shipping
app.post('/shipping', isAuthenticated, (req, res) => {
  const { firstName, lastName, email, phone, address, city, state, zip } = req.body;
  
  req.session.shipping = {
    firstName,
    lastName,
    email,
    phone,
    address,
    city,
    state,
    zip
  };
  
  const username = req.session.user?.username || 'unknown';
  const srcIp = req.ip;
  logger.action('SUBMITTED_SHIPPING', username, srcIp, { 
    name: `${firstName} ${lastName}`,
    email,
    city,
    state
  });
  
  res.redirect('/payment');
});

// Payment page
app.get('/payment', isAuthenticated, (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const username = req.session.user?.username || 'unknown';
  const srcIp = req.ip;
  logger.action('VIEWED_PAYMENT', username, srcIp, { itemsInCart: cart.length, total: total.toFixed(2) });
  res.render('payment', { total, paymentMethod: 'COD' });
});

// Handle payment
app.post('/payment', isAuthenticated, (req, res) => {
  const { paymentMethod } = req.body;
  
  // Generate order number
  const orderNumber = 'ORD-' + Date.now();
  
  // Create order
  const order = {
    orderNumber,
    user: req.session.user.username,
    items: req.session.cart || [],
    total: (req.session.cart || []).reduce((sum, item) => sum + (item.price * item.quantity), 0),
    shipping: req.session.shipping,
    paymentMethod,
    createdAt: new Date().toLocaleString()
  };
  
  store.orders.push(order);
  
  // Log order creation
  const username = req.session.user?.username || 'unknown';
  const srcIp = req.ip;
  logger.action('ORDER_PLACED', username, srcIp, { 
    orderNumber,
    itemCount: order.items.length,
    total: order.total.toFixed(2),
    paymentMethod,
    customerEmail: req.session.shipping?.email
  });
  
  // Store order in session for confirmation page
  req.session.order = order;
  
  // Clear cart
  req.session.cart = [];
  
  res.redirect('/confirmation');
});

// Order confirmation page
app.get('/confirmation', isAuthenticated, (req, res) => {
  const order = req.session.order;
  if (!order) {
    res.redirect('/products');
  } else {
    const username = req.session.user?.username || 'unknown';
    const srcIp = req.ip;
    logger.action('VIEWED_CONFIRMATION', username, srcIp, { 
      orderNumber: order.orderNumber,
      total: order.total.toFixed(2)
    });
    res.render('confirmation', { order });
  }
});

// View logs page
app.get('/logs', isAuthenticated, (req, res) => {
  const username = req.session.user?.username || 'unknown';
  const srcIp = req.ip;
  logger.action('VIEWED_LOGS', username, srcIp);
  
  const logFiles = logger.getLogFiles().reverse(); // Most recent first
  const selectedFile = req.query.file || (logFiles.length > 0 ? logFiles[0] : null);
  
  let logContent = null;
  let logStats = null;
  let logFileSize = '0 bytes';
  let logLines = 0;
  let lastModified = 'N/A';
  
  if (selectedFile) {
    logContent = logger.readLogFile(selectedFile);
    logFileSize = formatFileSize(logger.getLogFileSize(selectedFile));
    logLines = logContent ? logContent.split('\n').length : 0;
    
    // Read file stats
    const logFilePath = path.join(__dirname, 'logs', selectedFile);
    if (logContent) {
      const stats = fs.statSync(logFilePath);
      lastModified = new Date(stats.mtime).toLocaleString();
      
      // Get log statistics from JSON parser
      logStats = logger.getLogStatistics(selectedFile);
    }
  }
  
  res.render('logs', { 
    logFiles, 
    selectedFile, 
    logContent, 
    logStats,
    logFileSize,
    logLines,
    lastModified
  });
});

// Download logs
app.get('/download-logs', isAuthenticated, (req, res) => {
  const filename = req.query.file;
  const username = req.session.user?.username || 'unknown';
  const srcIp = req.ip;
  
  if (!filename) {
    res.redirect('/logs');
    return;
  }
  
  const logFilePath = path.join(__dirname, 'logs', filename);
  if (fs.existsSync(logFilePath)) {
    logger.action('DOWNLOADED_LOGS', username, srcIp, { filename });
    
    res.download(logFilePath, filename, (err) => {
      if (err) {
        logger.error('Error downloading logs', 'system', srcIp, { filename, error: err.message });
      }
    });
  } else {
    res.status(404).send('Log file not found');
  }
});

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 bytes';
  const k = 1024;
  const sizes = ['bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const startMsg = `SERVER STARTED on port ${PORT}`;
  logger.info('========================================', 'system', 'localhost');
  logger.success(startMsg, 'system', 'localhost', { 
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    url: `http://localhost:${PORT}`
  });
  logger.info('========================================', 'system', 'localhost');
});
