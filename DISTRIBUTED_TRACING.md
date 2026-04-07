# Distributed Tracing with OpenTelemetry

## Overview

This application implements distributed tracing using **OpenTelemetry (OTEL)** to track user transactions across multiple requests. Each user session maintains a single `trace_id` while individual requests create unique `span_id` values.

## Architecture

### Key Components

1. **OpenTelemetry SDK** - Core tracing infrastructure
2. **W3C Trace Context Propagator** - Standard distributed tracing protocol
3. **OTLP Exporter** - Sends traces to external collectors (Grafana, Jaeger, etc.)
4. **Session-Based Tracing** - Maintains trace context across user requests

### Trace Structure

```
Trace ID: 68766feaf679488d010c133e393aaf9c (single per user session)
├─ Span ID: 7b9d565184856f42 (User logged in)
├─ Span ID: 8ac177e613b74c8e (Viewed Products)
├─ Span ID: c2eb43ef50b01fa1 (Added to Cart)
├─ Span ID: b31cc6f2dfc345aa (Viewed Products)
└─ Span ID: 34e99155f6e007ba (Viewed Products)
```

## How It Works

### 1. Session-Based Trace Context

When a user makes their **first request**:
- A new root span is created
- The span's `trace_id` is extracted and stored in the user's session
- All subsequent requests reuse this `trace_id`

**Code:** [server.js](server.js#L28-L77)
```javascript
if (req.session && req.session.traceId) {
  // Reuse trace_id from session for all requests in this user's transaction
  traceId = req.session.traceId;
} else {
  // New transaction - start root span
  const span = tracer.startSpan(`${req.method} ${req.path}`);
  traceId = span.spanContext().traceId;
  req.session.traceId = traceId;
}
```

### 2. Span Per Request

Each HTTP request creates a **child span** under the trace:
- Captures HTTP method, URL, status code, client IP
- Linked to the same `trace_id` for the entire user journey
- Automatically ended when response is sent

### 3. Logging Integration

All log entries include OpenTelemetry context:

```json
{
  "timestamp": "2026-04-07T18:50:25.670Z",
  "application": "demo-ecom-app",
  "service": {
    "name": "demo-ecom-app",
    "version": "1.0.0"
  },
  "deployment": {
    "environment": "development"
  },
  "log_level": "SUCCESS",
  "message": "User logged in successfully",
  "trace_id": "68766feaf679488d010c133e393aaf9c",
  "span_id": "7b9d565184856f42",
  "src_ip": "::1",
  "user": "admin"
}
```

## Configuration

### Basic Setup (Enabled by Default)

The application automatically:
- Initializes OpenTelemetry with the service name `demo-ecom-app`
- Creates a BasicTracerProvider with semantic resource attributes
- Propagates trace context across HTTP requests
- Logs trace_id and span_id in all activity logs

**Configuration File:** [tracing.js](tracing.js)

### Grafana/Jaeger Integration

To send traces to an external backend:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://your-collector:4318/v1/traces npm start
```

**Supported Backends:**
- **Grafana Tempo** - Set OTLP HTTP endpoint to Grafana instance
- **Jaeger** - Configure Jaeger OTLP receiver (port 4318)
- **Datadog** - Use OTLP exporter with Datadog endpoint
- **New Relic** - Use OTLP exporter with New Relic endpoint

### Example: Local Grafana with Docker

```bash
# Start Grafana with Loki/Tempo
docker run -d \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana:latest

# Start OpenTelemetry Collector
docker run -d \
  -p 4318:4318 \
  otel/opentelemetry-collector:latest

# Start the application
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces npm start
```

## Trace Attributes

### Span Attributes

Each span captures:
- `http.method` - HTTP method (GET, POST, etc.)
- `http.url` - Full request URL
- `http.target` - Request path
- `http.host` - Request host
- `http.scheme` - Protocol (http, https)
- `http.client_ip` - Client IP address
- `http.status_code` - Response status code
- `transaction.new` - Whether this starts a new trace
- `session.id` - Express session ID

### Resource Attributes

The tracer provider includes:
- `service.name` - "demo-ecom-app"
- `service.version` - "1.0.0"
- `deployment.environment` - "development"

## API Reference

### Logger Trace Methods

```javascript
const logger = require('./logger');

// Set trace context (called automatically by middleware)
logger.setTraceContext(traceId, spanId);

// Clear trace context
logger.clearTraceContext();

// Log with automatic trace context
logger.action('VIEWED_PRODUCTS', 'admin', '192.168.1.1', { cartItems: 0 });
logger.success('User logged in successfully', 'admin', '192.168.1.1');
logger.error('Payment failed', 'admin', '192.168.1.1', { reason: 'Invalid card' });
```

### Tracer Methods

```javascript
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('demo-ecom-app', '1.0.0');

// Create a span
const span = tracer.startSpan('operation-name');

// Set span attributes
span.setAttributes({
  'custom.field': 'value',
  'order.id': 12345,
});

// Record exception
span.recordException(error);

// End span
span.end();
```

## User Journey Example

### Scenario: Customer Checkout Process

```
1. GET /login
   └─ Trace: abc123...
   └─ Span: span001 (Start session, create trace)
   └─ Log: "User logged in" with trace_id=abc123

2. GET /products
   └─ Trace: abc123... (SAME)
   └─ Span: span002 (Child of trace, new span)
   └─ Log: "VIEWED_PRODUCTS" with trace_id=abc123

3. POST /add-to-cart
   └─ Trace: abc123... (SAME)
   └─ Span: span003
   └─ Log: "ADDED_TO_CART" with trace_id=abc123

4. GET /shipping
   └─ Trace: abc123... (SAME)
   └─ Span: span004
   └─ Log: "VIEWED_SHIPPING" with trace_id=abc123

5. GET /payment
   └─ Trace: abc123... (SAME)
   └─ Span: span005
   └─ Log: "VIEWED_PAYMENT" with trace_id=abc123

6. POST /payment
   └─ Trace: abc123... (SAME)
   └─ Span: span006
   └─ Log: "PAYMENT_CONFIRMED" with trace_id=abc123
```

**Result:** Single trace with ID `abc123` tracks entire customer journey

## Viewing Logs

### Extract Trace for a User

```bash
# View all requests in a single transaction
grep '"trace_id":"68766feaf679488d010c133e393aaf9c"' logs/app-2026-04-07.log | jq '.'

# Get trace timeline
grep '"trace_id":"68766feaf679488d010c133e393aaf9c"' logs/app-2026-04-07.log | \
  jq '{timestamp: .timestamp, message: .message, span_id: .span_id}'
```

### Parse Statistics

```bash
# Count requests per trace
cat logs/app-*.log | jq -s 'group_by(.trace_id) | map({trace: .[0].trace_id, requests: length})'

# Find longest traces
cat logs/app-*.log | jq -s 'group_by(.trace_id) | sort_by(length) | reverse | .[0:5]'
```

## Grafana Dashboard

Once connected to Grafana with OTLP exporter:

1. **Trace View** - See entire user journey
   - View all spans in a single trace
   - See timeline and duration
   - Click spans to view attributes and logs

2. **Service Map** - Visualize service dependencies
   - Shows demo-ecom-app service
   - Can show multiple services if integrated

3. **Span Metrics** - Analyze request patterns
   - Average response time
   - Error rates by endpoint
   - Request distribution by URL

4. **Logs Integration** - Correlate logs with traces
   - Click trace_id in logs to see full trace
   - See logs associated with each span

## Troubleshooting

### Traces Not Appearing in Grafana

1. **Check OTLP endpoint is reachable:**
   ```bash
   curl http://localhost:4318/v1/traces
   ```

2. **Verify environment variable:**
   ```bash
   echo $OTEL_EXPORTER_OTLP_ENDPOINT
   ```

3. **Check application logs:**
   ```bash
   grep "OTLP exporter" logs/app-*.log
   ```

4. **Verify traces are being exported:**
   - Look for span processor logs
   - Check application stderr for export errors

### Session Resets Losing Trace Context

- Session timeout: Configure express-session `cookie.maxAge`
- Browser resets: Each new browser session gets new trace_id (expected)
- Same user: Use login credentials to correlate traces by user

### Span IDs Different Each Request

**This is correct!** Each request should have:
- Same `trace_id` (tracks entire user journey)
- Different `span_id` (tracks individual operations)

## Performance Considerations

- **Overhead**: Minimal - basic tracing adds <1ms per request
- **Storage**:~500 bytes per span in logs
- **Network**: OTLP export batches spans (configurable)

## Best Practices

1. **Use Meaningful Span Names**
   ```javascript
   tracer.startSpan('POST /payment'); // Good
   tracer.startSpan('request');        // Too generic
   ```

2. **Add Custom Attributes**
   ```javascript
   span.setAttributes({
     'user.id': userId,
     'product.id': productId,
     'order.total': total,
   });
   ```

3. **Correlate with Logs**
   - Always log with `trace_id` and `span_id` (automatic)
   - Search logs by trace_id to find user journey

4. **Monitor in Grafana**
   - Create dashboards for critical user flows
   - Set alerts on high error rates
   - Track performance per endpoint

## Related Documentation

- [OpenTelemetry JavaScript SDK](https://github.com/open-telemetry/opentelemetry-js)
- [OTLP Specification](https://github.com/open-telemetry/opentelemetry-specification/blob/main/protocol/README.md)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Grafana Tempo](https://grafana.com/oss/tempo/)

## Dependencies

```json
{
  "@opentelemetry/api": "^1.9.1",
  "@opentelemetry/sdk-trace-node": "^2.6.1",
  "@opentelemetry/exporter-trace-otlp-http": "^0.214.0",
  "@opentelemetry/resources": "^2.6.1",
  "@opentelemetry/semantic-conventions": "^1.40.0",
  "@opentelemetry/core": "^2.6.1"
}
```

## Future Enhancements

- [ ] Baggage propagation for metadata across traces
- [ ] Custom metrics (request duration, errors)
- [ ] Browser RUM (Real User Monitoring)
- [ ] Trace sampling based on URL patterns
- [ ] Multi-service tracing (microservices)
