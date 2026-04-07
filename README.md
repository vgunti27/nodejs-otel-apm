# Node.js Ecommerce Application

A simple but fully functional ecommerce application built with Node.js and Express, featuring admin login, product browsing, shopping cart, shipping information, COD payment, and order confirmation.

## Features

✅ **Admin Login** - Secure login with admin/admin credentials  
✅ **Product Catalog** - Display 6 sample products with descriptions and prices  
✅ **Shopping Cart** - Add/remove products, view cart summary  
✅ **Shipping Form** - Collect customer shipping details  
✅ **Payment Method** - Cash on Delivery (COD) payment option  
✅ **Order Confirmation** - Display order number and complete order details  
✅ **Session Management** - Maintain user sessions throughout the checkout process  
✅ **Responsive Design** - Works on desktop and mobile devices  
✅ **Activity Logging** - Complete logging of all user actions and system events  

## Tech Stack

- **Backend**: Node.js with Express.js
- **Frontend**: EJS templating engine
- **Session**: express-session for user authentication
- **Styling**: Custom CSS with responsive design
- **Storage**: In-memory storage (no database required)

## Project Structure

```
nodejs-ecommerce/
├── public/
│   └── style.css           # Stylesheet for all pages
├── views/
│   ├── login.ejs           # Admin login page
│   ├── products.ejs        # Product catalog
│   ├── cart.ejs            # Shopping cart
│   ├── shipping.ejs        # Shipping information form
│   ├── payment.ejs         # Payment method selection
│   └── confirmation.ejs    # Order confirmation
├── server.js               # Main Express server
├── package.json            # Dependencies
└── README.md              # This file
```

## Installation

1. **Clone the repository** (if starting fresh):
   ```bash
   cd /workspaces/nodejs-otel-apm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Running the Application

### Development Mode (with auto-reload):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

The application will start on **http://localhost:3000**

## Usage

### Step-by-Step Walkthrough:

1. **Login**: Open http://localhost:3000 and login with:
   - Username: `admin`
   - Password: `admin`

2. **Browse Products**: View all available products (Laptop, Smartphone, Headphones, Monitor, Keyboard, Mouse)

3. **Add to Cart**: Click "Add to Cart" on any product

4. **View Cart**: Click the "Cart" link in the navigation to review your items

5. **Shipping**: Click "Proceed to Shipping" and fill in your details:
   - First Name, Last Name
   - Email, Phone
   - Address, City, State, ZIP Code

6. **Payment**: Select "Cash on Delivery (COD)" as your payment method

7. **Order Confirmation**: 
   - You'll receive an order number (format: `ORD-{timestamp}`)
   - View complete order details
   - See shipping address and payment method

### Sample Products

The application comes pre-loaded with these products:

| Product | Price |
|---------|-------|
| Laptop | $1,200 |
| Smartphone | $800 |
| Headphones | $150 |
| Monitor | $400 |
| Keyboard | $100 |
| Mouse | $50 |

## Features Details

### Admin Authentication
- Simple username/password authentication
- Sessions maintained for 60 minutes
- Logout functionality to clear session

### Shopping Cart
- Add multiple quantities of the same product
- Remove items from cart
- View running cart count in navigation
- Price calculations updated in real-time

### Order Processing
- Collect complete customer information
- Support for COD (Cash on Delivery) payment
- Generate unique order numbers
- Store orders in memory
- Display comprehensive order summary

### Responsive Design
- Mobile-friendly interface
- Adaptive layouts for tablets and desktop
- Touch-friendly buttons and forms

## Activity Logging System

The application includes a comprehensive activity logging system that tracks all user actions:

### What Gets Logged:
- **Authentication**: Login attempts (success/failure), logouts
- **Shopping**: Browsing products, adding/removing items, viewing cart
- **Checkout**: Shipping info, payment method, order placement
- **System**: Server startup, page views, log downloads

### JSON Logging Format:
All logs are stored in **structured JSON format** for easy parsing and analysis:

```json
{
  "timestamp": "2026-04-07T18:34:55.766Z",
  "application": "demo-ecom-app",
  "log_level": "ACTION",
  "message": "VIEWED_PRODUCTS",
  "src_ip": "::1",
  "user": "admin",
  "details": {"cartItems": 0}
}
```

**Fields:**
- `timestamp` - ISO 8601 UTC timestamp
- `application` - App identifier (demo-ecom-app)
- `log_level` - Level (INFO, SUCCESS, ACTION, WARN, ERROR)
- `message` - Action/event description
- `src_ip` - Source IP address
- `user` - Username
- `details` - Additional context

### Accessing Logs:
1. Login to the application
2. Click the **"Logs"** link in the navigation bar
3. View statistics and activity in real-time
4. Download logs for analysis

### Log Files:
- Stored in `/logs/` directory
- One file per day: `app-YYYY-MM-DD.log`
- Each line is valid JSON for easy parsing
- Color-coded display in web interface

**For detailed JSON logging documentation, see [JSON_LOGGING.md](JSON_LOGGING.md)**  
**For general logging info, see [LOGGING.md](LOGGING.md)**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Redirects to login or products |
| GET | `/login` | Login page |
| POST | `/login` | Handle login submission |
| GET | `/logout` | Clear session and logout |
| GET | `/products` | Product listing page |
| POST | `/add-to-cart` | Add product to cart |
| GET | `/cart` | View shopping cart |
| POST | `/remove-from-cart` | Remove product from cart |
| GET | `/shipping` | Shipping information form |
| POST | `/shipping` | Submit shipping details |
| GET | `/payment` | Payment method selection |
| POST | `/payment` | Submit payment and create order |
| GET | `/confirmation` | Order confirmation page |

## Customization

### Add New Products
Edit the `store.products` array in `server.js`:

```javascript
{ id: 7, name: 'Product Name', price: 999, description: 'Product description', image: 'image.jpg' }
```

### Change Login Credentials
Modify the login validation in `server.js`:

```javascript
if (username === 'your-username' && password === 'your-password') {
```

### Modify Session Timeout
Change the `maxAge` in session configuration (currently 60 minutes):

```javascript
cookie: { maxAge: 60000 * 120 } // 120 minutes
```

### Update Styling
Edit `/public/style.css` to customize colors, fonts, and layouts

## Notes

- This application uses in-memory storage, so:
  - Orders are lost when the server restarts
  - No persistent database is used
  - Each session is independent
  
- To add persistence, you can integrate:
  - MongoDB for orders and user data
  - SQLite for lightweight local database
  - PostgreSQL for production use

## Future Enhancements

- User registration and account management
- Product search and filtering
- Multiple payment methods (Credit Card, UPI, etc.)
- Order history/tracking
- Email notifications
- Admin dashboard to view orders
- Inventory management
- Product reviews and ratings

## License

ISC

## Support

For issues or questions, feel free to modify and test the application locally.
