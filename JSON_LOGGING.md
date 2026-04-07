# JSON Logging Format Documentation

## Overview

The ecommerce application now uses structured JSON logging format for all activity tracking. Each log entry is a valid JSON object that can be easily parsed, indexed, and analyzed by external systems.

## JSON Log Format

Each log entry follows this exact JSON structure:

```json
{
  "timestamp": "2026-04-07T18:34:55.766Z",
  "application": "demo-ecom-app",
  "log_level": "ACTION",
  "message": "VIEWED_PRODUCTS",
  "src_ip": "::1",
  "user": "admin",
  "details": {
    "cartItems": 0
  }
}
```

## Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| **timestamp** | ISO 8601 | UTC timestamp in ISO format | `2026-04-07T18:34:55.766Z` |
| **application** | String | Application identifier | `demo-ecom-app` |
| **log_level** | String | Log level (severity) | `INFO`, `SUCCESS`, `ACTION`, `WARN`, `ERROR` |
| **message** | String | Action or event description | `VIEWED_PRODUCTS`, `ORDER_PLACED` |
| **src_ip** | String | Source IP address | `::1`, `192.168.1.1`, `localhost` |
| **user** | String | Username performing the action | `admin`, `system` |
| **details** | Object | Additional context-specific data | `{"cartItems": 0, "total": "1200.00"}` |

## Log Levels

### INFO
General information about system events.

```json
{
  "log_level": "INFO",
  "message": "System informational message",
  "user": "system"
}
```

### SUCCESS
Successful operations completed.

```json
{
  "log_level": "SUCCESS",
  "message": "User logged in successfully",
  "user": "admin",
  "details": {"attemptedUsername": "admin"}
}
```

### ACTION
User actions and interactions.

```json
{
  "log_level": "ACTION",
  "message": "ADDED_TO_CART",
  "user": "admin",
  "details": {
    "productId": 1,
    "productName": "Laptop",
    "price": 1200,
    "cartSize": 1
  }
}
```

### WARN
Warning messages for unexpected events.

```json
{
  "log_level": "WARN",
  "message": "Failed login attempt",
  "user": "system",
  "details": {"attemptedUsername": "hacker"}
}
```

### ERROR
Error events and exceptions.

```json
{
  "log_level": "ERROR",
  "message": "Error downloading logs",
  "user": "system",
  "details": {"filename": "app-2026-04-07.log", "error": "File not found"}
}
```

## Complete Log Examples

### Login Success
```json
{
  "timestamp": "2026-04-07T18:34:55.766Z",
  "application": "demo-ecom-app",
  "log_level": "SUCCESS",
  "message": "User logged in successfully",
  "src_ip": "::1",
  "user": "admin",
  "details": {"attemptedUsername": "admin"}
}
```

### Add to Cart
```json
{
  "timestamp": "2026-04-07T18:35:12.543Z",
  "application": "demo-ecom-app",
  "log_level": "ACTION",
  "message": "ADDED_TO_CART",
  "src_ip": "::1",
  "user": "admin",
  "details": {
    "productId": 1,
    "productName": "Laptop",
    "price": 1200,
    "cartSize": 1
  }
}
```

### View Cart
```json
{
  "timestamp": "2026-04-07T18:35:20.234Z",
  "application": "demo-ecom-app",
  "log_level": "ACTION",
  "message": "VIEWED_CART",
  "src_ip": "::1",
  "user": "admin",
  "details": {
    "cartItems": 1,
    "total": "1200.00"
  }
}
```

### Submit Shipping
```json
{
  "timestamp": "2026-04-07T18:35:45.891Z",
  "application": "demo-ecom-app",
  "log_level": "ACTION",
  "message": "SUBMITTED_SHIPPING",
  "src_ip": "::1",
  "user": "admin",
  "details": {
    "name": "John Doe",
    "email": "john@example.com",
    "city": "New York",
    "state": "NY"
  }
}
```

### Place Order
```json
{
  "timestamp": "2026-04-07T18:36:00.567Z",
  "application": "demo-ecom-app",
  "log_level": "ACTION",
  "message": "ORDER_PLACED",
  "src_ip": "::1",
  "user": "admin",
  "details": {
    "orderNumber": "ORD-1743076560567",
    "itemCount": 1,
    "total": "1200.00",
    "paymentMethod": "COD",
    "customerEmail": "john@example.com"
  }
}
```

### View Confirmation
```json
{
  "timestamp": "2026-04-07T18:36:05.234Z",
  "application": "demo-ecom-app",
  "log_level": "ACTION",
  "message": "VIEWED_CONFIRMATION",
  "src_ip": "::1",
  "user": "admin",
  "details": {
    "orderNumber": "ORD-1743076560567",
    "total": "1200.00"
  }
}
```

### Failed Login
```json
{
  "timestamp": "2026-04-07T18:35:30.432Z",
  "application": "demo-ecom-app",
  "log_level": "WARN",
  "message": "Failed login attempt",
  "src_ip": "192.168.1.100",
  "user": "system",
  "details": {"attemptedUsername": "wronguser"}
}
```

## Parsing JSON Logs

### Using Command Line Tools

**Extract all logins:**
```bash
grep "User logged in" logs/app-2026-04-07.log | jq '.user'
```

**Find all failed logins:**
```bash
grep "WARN" logs/app-2026-04-07.log | jq -r '.details.attemptedUsername'
```

**Count actions by type:**
```bash
grep "ACTION" logs/app-2026-04-07.log | jq '.message' | sort | uniq -c
```

**Count logs by level:**
```bash
jq '.log_level' logs/app-2026-04-07.log | sort | uniq -c
```

**Find all orders placed:**
```bash
grep "ORDER_PLACED" logs/app-2026-04-07.log | jq '.details | {orderNumber, total}'
```

### Using JavaScript

```javascript
const fs = require('fs');

// Read and parse logs
const logs = fs.readFileSync('logs/app-2026-04-07.log', 'utf8')
  .split('\n')
  .filter(line => line.trim())
  .map(line => JSON.parse(line));

// Filter by level
const errors = logs.filter(log => log.log_level === 'ERROR');

// Group by user
const byUser = logs.reduce((acc, log) => {
  acc[log.user] = (acc[log.user] || 0) + 1;
  return acc;
}, {});

// Calculate total revenue
const totalRevenue = logs
  .filter(log => log.message === 'ORDER_PLACED')
  .reduce((sum, log) => sum + parseFloat(log.details.total), 0);
```

### Using Python

```python
import json

# Read logs
with open('logs/app-2026-04-07.log', 'r') as f:
    logs = [json.loads(line) for line in f if line.strip()]

# Filter by level
errors = [log for log in logs if log['log_level'] == 'ERROR']

# Count by action
from collections import Counter
actions = Counter(log['message'] for log in logs)

# Find orders
orders = [log for log in logs if log['message'] == 'ORDER_PLACED']
total_revenue = sum(float(order['details']['total']) for order in orders)
```

## Integration with Log Management Systems

### ELK Stack (Elasticsearch, Logstash, Kibana)

Configure Logstash to parse JSON logs:

```conf
input {
  file {
    path => "/workspaces/nodejs-otel-apm/logs/*.log"
    codec => json
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "ecommerce-logs-%{+YYYY.MM.dd}"
  }
}
```

### Splunk

Add the log directory as a source:

```
[monitor:///workspaces/nodejs-otel-apm/logs]
sourcetype = _json
index = ecommerce
```

### CloudWatch (AWS)

Configure log agent to stream JSON logs:

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/workspaces/nodejs-otel-apm/logs/*.log",
            "log_group_name": "/ecommerce/app",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
```

### Custom Analytics

**MongoDB Import:**
```bash
mongoimport --db ecommerce --collection logs --file logs/app-2026-04-07.log --jsonArray
```

**PostgreSQL Import:**
```sql
CREATE TABLE logs (
  timestamp TIMESTAMP,
  application VARCHAR,
  log_level VARCHAR,
  message VARCHAR,
  src_ip VARCHAR,
  "user" VARCHAR,
  details JSONB
);

\copy logs from 'logs/app-2026-04-07.log' with (format json);
```

## Benefits of JSON Logging

✅ **Machine Readable** - Easy parsing by any programming language  
✅ **Structured Data** - Consistent format for all entries  
✅ **Tool Integration** - Works with ELK, Splunk, DataDog, etc.  
✅ **Query Friendly** - Use jq, SQL, or MongoDB queries  
✅ **Compact Format** - Efficient storage compared to text logs  
✅ **Rich Context** - Detailed information in structured fields  
✅ **Timestamped** - ISO 8601 format for precise analysis  

## Log File Rotation

For production use, implement log rotation:

```javascript
// Add to logger.js for automatic daily rotation
const maxLogSize = 10 * 1024 * 1024; // 10MB

if (fs.statSync(logFile).size > maxLogSize) {
  const date = new Date().toISOString().split('T')[0];
  const backup = logFile.replace('.log', `-${date}.log`);
  fs.renameSync(logFile, backup);
}
```

## Performance Considerations

- **File I/O**: Asynchronous writes recommended for high-volume logging
- **JSON Parsing**: Pre-compile parsing patterns for frequently analyzed logs
- **Storage**: ~1-5 KB per user action, ~50-100 KB per day typical usage
- **Indexing**: Use log aggregation services for 1000+ logs/min

## Security & Privacy

⚠️ **Important Notes:**

- **Passwords**: Never logged
- **Credit Cards**: Never logged
- **Personal Data**: Only logged when necessary (email in orders)
- **IP Addresses**: Logged for security audit trails
- **Access Control**: Restrict `/logs` endpoint to authenticated admins

## Querying Examples

### List all users
```bash
cat logs/app-2026-04-07.log | jq -r '.user' | sort -u
```

### Find user activity timeline
```bash
cat logs/app-2026-04-07.log | jq -r '[.timestamp, .user, .message] | @csv' | sort
```

### Revenue report
```bash
cat logs/app-2026-04-07.log | jq 'select(.message=="ORDER_PLACED") | {user: .user, orderNumber: .details.orderNumber, total: .details.total}'
```

### IP activity report
```bash
cat logs/app-2026-04-07.log | jq -r '.src_ip' | sort | uniq -c | sort -rn
```

## Troubleshooting

### Logs not generating
1. Check file permissions on `/logs` directory
2. Verify logger module is properly imported
3. Check console for initialization errors

### Invalid JSON in logs
1. Ensure details object contains only JSON-serializable values
2. Check for circular references in objects
3. Validate timestamp format (ISO 8601)

### Performance issues
1. Consider archiving old logs
2. Implement log rotation for large files
3. Use streaming for high-volume analysis

---

**Happy logging! 📊**
