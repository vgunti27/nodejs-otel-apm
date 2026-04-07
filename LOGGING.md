# Activity Logging System

## Overview

The ecommerce application now includes a comprehensive activity logging system that tracks every user action and system event. All logs are saved to files with timestamps and can be viewed through the web interface.

## Log Files Location

All log files are stored in the `/logs` directory:
```
/workspaces/nodejs-otel-apm/logs/
├── app-2026-04-07.log
├── app-2026-04-08.log
└── ...
```

Each day generates a new log file with the format: `app-YYYY-MM-DD.log`

## Logging Features

### 1. **Automatic Daily Logs**
- New log file created for each day
- Format: `app-YYYY-MM-DD.log`
- Logs persist between application restarts

### 2. **Log Levels**
The system uses 5 log levels:

| Level | Color | Usage |
|-------|-------|-------|
| **INFO** | Cyan | General information about application events |
| **SUCCESS** | Green | Successful operations (login, orders placed) |
| **ACTION** | Blue | User activities (cart, shipping, etc.) |
| **WARN** | Orange | Warning messages (failed login attempts) |
| **ERROR** | Red | Error events and exceptions |

### 3. **Console & File Logging**
- All logs are written to both:
  - Console output (for immediate feedback)
  - Log files (for persistent storage)

## What Gets Logged

### Authentication Events
- ✅ **Successful Login** - Username, IP address
- ❌ **Failed Login Attempts** - Attempted username, IP address
- 🚪 **Logout** - Username, timestamp

### Shopping Actions
- 🛒 **View Products Page** - Number of items in cart
- ➕ **Add to Cart** - Product ID, name, price, cart size
- ➖ **Remove from Cart** - Product ID, name, cart size
- 👀 **View Cart** - Number of items, total amount

### Checkout Process
- 📋 **View Shipping Form** - Items in cart
- ✉️ **Submit Shipping Info** - Customer name, email, city, state
- 💳 **View Payment Page** - Items in cart, total amount
- 📦 **Place Order** - Order number, items, total, payment method, customer email
- ✅ **View Confirmation** - Order number, total

### System Events
- 🚀 **Server Start** - Port, environment, URL
- 📊 **View Logs** - User accessing logs page
- 💾 **Download Logs** - Log file being downloaded

## Accessing Logs

### Via Web Interface (Recommended)

1. **Login** to the application with admin/admin
2. **Click "Logs"** link in the navigation bar
3. **Select a log file** from the dropdown
4. **View statistics** including:
   - Total info messages
   - Successful actions
   - User actions
   - Warnings and errors
5. **Download logs** for offline analysis

### Via File System

Log files can be accessed directly at:
```bash
/workspaces/nodejs-otel-apm/logs/
```

Open any `app-YYYY-MM-DD.log` file with a text editor.

## Log Entry Format

Each log entry follows this format:

```
[YYYY-MM-DD HH:MM:SS] [LEVEL] Message
           Details: {JSON details}
```

### Example Entries

**Login Success:**
```
[2026-04-07 18:31:58] [SUCCESS] User logged in successfully
           Details: {"username":"admin","ipAddress":"::1"}
```

**Add to Cart:**
```
[2026-04-07 18:32:15] [ACTION] USER: admin - ACTION: ADDED_TO_CART
           Details: {"productId":1,"productName":"Laptop","price":1200,"cartSize":1}
```

**Order Placed:**
```
[2026-04-07 18:35:42] [ACTION] USER: admin - ACTION: ORDER_PLACED
           Details: {"orderNumber":"ORD-1648485342000","itemCount":2,"total":"2000.00","paymentMethod":"COD","customerEmail":"john@example.com"}
```

**Failed Login:**
```
[2026-04-07 18:31:30] [WARN] Failed login attempt
           Details: {"attemptedUsername":"user","ipAddress":"::1"}
```

## Log Statistics Dashboard

The logs viewer displays real-time statistics:

| Metric | Description |
|--------|-------------|
| **Info Messages** | General system information events |
| **Success Actions** | Successful operations count |
| **Warnings** | Failed attempts and warnings |
| **Errors** | Error events and exceptions |
| **User Actions** | Total user activity events |

The dashboard also shows:
- **File Size** - Current log file size in KB/MB
- **Total Lines** - Number of log entries
- **Last Modified** - When the log was last updated

## Log Viewer Features

### Search & Filter
The log viewer displays:
- Color-coded log entries by level
- Scrollable log content area
- File size information
- Entry count
- Last modified timestamp

### Download Logs
- **One-click download** of any log file
- Format: Plain text
- Can be imported into analysis tools
- Useful for archiving and auditing

## Customizing Log Behavior

### Modify Log Levels

Edit `logger.js` to change what gets logged:

```javascript
// Add custom logging for specific events
logger.info('Custom message', { customData: 'value' });
logger.userAction('username', 'ACTION_NAME', { details: 'here' });
```

### Change Log Directory

Edit `logger.js` to change log location:

```javascript
this.logsDir = path.join(__dirname, 'custom-logs-path');
```

### Archive Old Logs

Create a script to archive logs older than 30 days:

```javascript
const logAge = Date.now() - fs.statSync(logFile).mtime;
if (logAge > 30 * 24 * 60 * 60 * 1000) {
  // Archive or delete
}
```

## Security Considerations

⚠️ **Important Notes:**

- **Sensitive Data**: Passwords are NOT logged
- **Email Addresses**: Only logged when explicitly needed (shipping, orders)
- **IP Addresses**: Logged for security audit trails
- **File Permissions**: Ensure `/logs` directory is not publicly accessible

## Performance Impact

- Logging is optimized with **asynchronous file writes**
- Minimal performance overhead
- Log files grow approximately:
  - 1-5 KB per user session
  - 50-100 KB per day of normal usage

## Troubleshooting

### Logs Not Being Created

1. Check if `/logs` directory exists:
   ```bash
   ls -la /workspaces/nodejs-otel-apm/logs/
   ```

2. Verify permissions:
   ```bash
   chmod 755 /workspaces/nodejs-otel-apm/logs/
   ```

3. Check server output for errors

### Logs Not Showing in Web Interface

1. Ensure you're logged in as admin
2. Verify log files exist in `/logs` directory
3. Check browser console for JavaScript errors

### Large Log Files

To manage large log files:

```bash
# View recent entries
tail -100 app-2026-04-07.log

# Count entries by type
grep "[SUCCESS]" app-2026-04-07.log | wc -l

# Search for specific user
grep "admin" app-2026-04-07.log
```

## Example Log Analysis

### Count logins by user:
```bash
grep "logged in successfully" app-2026-04-07.log | wc -l
```

### Find orders placed:
```bash
grep "ORDER_PLACED" app-2026-04-07.log
```

### Detect failed login attempts:
```bash
grep "Failed login" app-2026-04-07.log
```

### Check total revenue (sum of orders):
```bash
grep "ORDER_PLACED" app-2026-04-07.log | grep -o '"total":"[^"]*"'
```

## API Routes for Logs

### GET `/logs`
- View logs web interface
- Requires authentication
- Query parameter: `file=app-YYYY-MM-DD.log`

### GET `/download-logs`
- Download specific log file
- Requires authentication
- Query parameter: `file=app-YYYY-MM-DD.log`

## Integration with External Tools

Log files can be integrated with:

- **ELK Stack** - Elasticsearch, Logstash, Kibana
- **Splunk** - Enterprise log analytics
- **DataDog** - Cloud monitoring
- **New Relic** - Application performance monitoring
- **CloudWatch** - AWS log management

For integration, the JSON details in each log entry provide structured data for parsing.

## Future Enhancements

- 📊 Advanced analytics and charts
- 🔍 Full-text search across logs
- 📧 Email alerts for critical events
- 🗂️ Automatic log rotation and archiving
- 🔐 Encrypted log storage
- 📈 Performance metrics and dashboard
- 🌍 Multi-user activity comparison

## Quick Reference

| Action | What Gets Logged |
|--------|------------------|
| Login | Username, IP, success/failure |
| Browse Products | Item count in cart |
| Add to Cart | Product details, cart size |
| Remove from Cart | Product name, new cart size |
| View Cart | Item count, total |
| Ship | Customer info, address |
| Payment | Order number, total, method |
| Confirmation | Order number, total |
| Download Logs | Filename, timestamp |

---

**Happy logging! 📊**
