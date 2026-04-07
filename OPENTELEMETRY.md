# OpenTelemetry (OTEL) Instrumentation Guide

## Overview

This project uses **OpenTelemetry** to provide comprehensive observability through distributed tracing, metrics, and contextual logging. OpenTelemetry is an industry-standard, vendor-neutral framework for collecting telemetry data from your applications.

## What is OpenTelemetry?

OpenTelemetry (OTEL) is a collection of tools, APIs, and SDKs that enable you to:

- **Collect Traces** - Track user requests across your application
- **Gather Metrics** - Measure performance, latency, error rates
- **Aggregate Logs** - Correlate logs with traces for context
- **Propagate Context** - Share trace IDs across service boundaries
- **Export Telemetry** - Send data to backends like Grafana, Datadog, Jaeger

**Key Benefits:**
- 🔍 Visibility into application behavior
- 🎯 Root cause analysis for performance issues
- 📊 Data-driven monitoring and alerting
- 🔗 Correlate multiple signals (traces + logs + metrics)
- 🏢 Support for microservices and distributed systems

## Project Integration

### Instrumentation in This Project

#### 1. HTTP Request Tracing
Every HTTP request creates a **span** with:
- HTTP method and URL
- Response status code
- Request duration
- Client IP address
- Session ID

**Component:** [server.js](server.js#L28-L77) - OpenTelemetry middleware

#### 2. Distributed Tracing
- **Single trace_id per user session** - Tracks entire user journey
- **Multiple span_ids per trace** - Each request gets unique span
- **Automatic propagation** - W3C Trace Context standard
- **Session persistence** - Trace ID stored in express-session

**Component:** [tracing.js](tracing.js) - Trace provider setup

#### 3. Contextual Logging
Every log entry includes:
- `trace_id` - Identifies the user's transaction
- `span_id` - Identifies the specific operation
- `service.name` - Application identifier
- `deployment.environment` - Environment info

**Component:** [logger.js](logger.js) - AsyncLocalStorage for context

#### 4. OTLP Export
- **Protocol**: OTLP/HTTP (OpenTelemetry Protocol)
- **Default Endpoint**: `http://localhost:4318/v1/traces`
- **Format**: JSON batches of spans
- **Backend**: OTEL Collector → Grafana Tempo

**Component:** [tracing.js](tracing.js#L26-L37) - OTLP exporter

## Key Concepts

### Trace
A **trace** represents a complete user transaction or workflow.

```
Trace ID: 68766feaf679488d010c133e393aaf9c
├─ Login Request → Span 1
├─ View Products → Span 2
├─ Add to Cart → Span 3
├─ View Shipping → Span 4
└─ Confirm Payment → Span 5
```

**Duration**: From first request to last
**Use Case**: Understand complete user journey

### Span
A **span** represents a single operation or request within a trace.

```
Span Details:
├─ Name: "POST /add-to-cart"
├─ Start Time: 2026-04-07T18:50:33.598Z
├─ Duration: 45ms
├─ Status: Success
├─ Attributes:
│  ├─ http.method: POST
│  ├─ http.target: /add-to-cart
│  ├─ http.status_code: 200
│  ├─ http.client_ip: ::1
│  └─ session.id: abc123...
└─ Parent Span: [trace context]
```

**Duration**: Single operation time
**Use Case**: Debug performance of specific endpoint

### Attributes
**Span attributes** provide context about the operation.

```json
{
  "http.method": "POST",
  "http.url": "http://localhost:3000/add-to-cart",
  "http.target": "/add-to-cart",
  "http.host": "localhost",
  "http.scheme": "http",
  "http.client_ip": "::1",
  "http.status_code": 200,
  "transaction.new": false,
  "session.id": "connect.sid"
}
```

### Resource Attributes
**Resource attributes** describe your service.

```json
{
  "service.name": "demo-ecom-app",
  "service.version": "1.0.0",
  "deployment.environment": "development"
}
```

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│              Node.js Application                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │     Express HTTP Routes                         │   │
│  │  /login, /products, /cart, /shipping, etc.    │   │
│  └───────────────┬─────────────────────────────────┘   │
│                  │                                      │
│                  ▼                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  OpenTelemetry Middleware (server.js:28-77)   │   │
│  │  └─ Create spans for each request              │   │
│  │  └─ Extract/store trace context                │   │
│  │  └─ Set span attributes                        │   │
│  └───────────────┬─────────────────────────────────┘   │
│                  │                                      │
│                  ▼                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Tracer (from OpenTelemetry API)              │   │
│  │  └─ Create spans                               │   │
│  │  └─ End spans                                  │   │
│  │  └─ Propagate context                          │   │
│  └───────────────┬─────────────────────────────────┘   │
│                  │                                      │
│                  ▼                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Logger with Trace Context (logger.js)        │   │
│  │  └─ Extract trace_id, span_id                  │   │
│  │  └─ Add to JSON logs                           │   │
│  │  └─ Write to log files                         │   │
│  └───────────────┬─────────────────────────────────┘   │
│                  │                                      │
│      ┌───────────┴──────────────┐                     │
│      │                          │                     │
│      ▼                          ▼                     │
│  ┌────────────┐          ┌─────────────┐             │
│  │  Log Files │          │  OTLP Export│             │
│  │ (JSON fmt) │          │ (HTTP Port  │             │
│  │ ./logs/    │          │  4318)      │             │
│  └────────────┘          └──────┬──────┘             │
│                                  │                    │
└──────────────────────────────────┼────────────────────┘
                                   │
                ┌──────────────────▼──────────────────┐
                │   OTEL Collector                    │
                │ (Receives OTLP HTTP)               │
                └──────────────┬───────────────────┘
                               │
                ┌──────────────▼──────────────────┐
                │   Grafana Tempo                 │
                │ (Stores traces)                 │
                └──────────────┬───────────────────┘
                               │
                ┌──────────────▼──────────────────┐
                │   Grafana                       │
                │ (Queries & visualizes)          │
                └─────────────────────────────────┘
```

## Usage & Examples

### 1. Automatic Tracing (No Code Changes)

The application automatically traces HTTP requests. Just make requests:

```bash
# Login
curl -X POST http://localhost:3000/login \
  -d "username=admin&password=admin" \
  -H "Content-Type: application/x-www-form-urlencoded"

# This automatically creates:
# - A root span for the login request
# - Stores trace_id in the session
# - Triggers logging with trace context
```

### 2. View Traces in Logs

```bash
# See a specific trace
grep 'trace_id":"68766feaf679488d010c133e393aaf9c' logs/app-*.log | jq '.'

# Result: All requests in that user's session with same trace_id
```

### 3. Manual Span Creation

For custom operations inside route handlers:

```javascript
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('demo-ecom-app', '1.0.0');

// In your route handler
app.post('/custom-operation', (req, res) => {
  // Middleware already created a span, but you can create child spans
  const childSpan = tracer.startSpan('process-data');
  
  try {
    childSpan.setAttributes({
      'custom.operation_id': req.body.id,
      'custom.data_size': JSON.stringify(req.body).length,
    });
    
    // Your logic here
    const result = processData(req.body);
    
    childSpan.setAttributes({
      'custom.success': true,
      'custom.result_size': JSON.stringify(result).length,
    });
  } catch (error) {
    childSpan.recordException(error);
    childSpan.setStatus({ code: 2 }); // ERROR
  } finally {
    childSpan.end();
  }
  
  res.json({ status: 'ok' });
});
```

### 4. Record Errors

```javascript
try {
  // Some operation
  await paymentGateway.charge(amount);
} catch (error) {
  // Current span automatically records error
  span.recordException(error);
  span.setStatus({ 
    code: 2, // ERROR
    message: error.message 
  });
  
  // Log also includes trace context
  logger.error('Payment failed', userId, req.ip, {
    orderId: req.body.orderId,
    error: error.message
  });
}
```

### 5. Custom Metrics

```javascript
// Create a counter metric
const { metrics } = require('@opentelemetry/api');
const provider = metrics.getMeterProvider();
const meter = provider.getMeter('demo-ecom-app');

const orderCounter = meter.createCounter('ecommerce.orders.total', {
  description: 'Total orders placed'
});

// Increment in route
app.post('/checkout', (req, res) => {
  // ... process checkout ...
  
  orderCounter.add(1, {
    'order.status': 'completed',
    'order.currency': req.body.currency,
  });
});
```

## Configuration

### Environment Variables

```bash
# OTLP Exporter endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Service identification
OTEL_SERVICE_NAME=demo-ecom-app

# Environment
DEPLOYMENT_ENV=development

# Optional: Sampling (0-1, default 1.0 = never sample)
OTEL_TRACES_SAMPLER=parentbased_always_on

# Optional: Batch size for export
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=1024
```

### Programmatic Configuration

Edit [tracing.js](tracing.js):

```javascript
// Change resource attributes
const resource = resourceFromAttributes({
  'service.name': 'my-app',
  'service.version': '2.0.0',
  'deployment.environment': process.env.ENV,
});

// Change OTLP endpoint
const otlpExporter = new OTLPTraceExporter({
  url: 'https://api.grafana.com/v1/traces', // Your Grafana cloud instance
});
```

## Integration Points

### 1. Express Middleware

**File**: [server.js](server.js#L28-L77)

```javascript
app.use((req, res, next) => {
  // Creates span for each request
  const span = tracer.startSpan(`${req.method} ${req.path}`);
  
  // Stores trace_id in session
  if (req.session && req.session.traceId) {
    traceId = req.session.traceId; // Reuse for same user
  } else {
    req.session.traceId = traceId; // New transaction
  }
  
  // Makes context available to logger
  logger.setTraceContext(traceId, spanId);
  
  // Ends span on response
  res.on('finish', () => span.end());
  
  next();
});
```

### 2. Logger Integration

**File**: [logger.js](logger.js)

```javascript
// Uses AsyncLocalStorage to access trace context
getTraceContext() {
  const storedContext = traceContextStorage.getStore();
  if (storedContext) return storedContext;
  
  // Fallback to OpenTelemetry API
  const span = trace.getActiveSpan();
  return span ? {
    trace_id: span.spanContext().traceId,
    span_id: span.spanContext().spanId
  } : { trace_id: 'no-trace', span_id: 'no-span' };
}

// Every log includes trace context
createLogObject(level, message, user, srcIp, details) {
  const traceContext = this.getTraceContext();
  return {
    trace_id: traceContext.trace_id,
    span_id: traceContext.span_id,
    // ... other fields
  };
}
```

### 3. OTLP Exporter

**File**: [tracing.js](tracing.js#L26-L37)

```javascript
const otlpExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

tracerProvider.addSpanProcessor(new SimpleSpanProcessor(otlpExporter));
```

This sends spans to your configured backend in real-time.

## Monitoring & Observability

### View Current Traces

```bash
# All traces from the last 5 minutes
cat logs/app-*.log | jq 'select(.timestamp > now - 300)' | jq 'group_by(.trace_id)'

# Count requests per trace
cat logs/app-*.log | jq -s 'group_by(.trace_id) | map({trace: .[0].trace_id, requests: length})'

# Find longest traces (most operations)
cat logs/app-*.log | jq -s 'group_by(.trace_id) | sort_by(length) | reverse | .[0:3]'
```

### Monitor in Grafana

1. **Trace View**:
   - Service: `demo-ecom-app`
   - See all spans in a single trace
   - View timeline and duration

2. **Service Map**:
   - Shows service node
   - Displays request flow
   - Highlights error rates

3. **Metrics**:
   - Request rate
   - Error rate
   - Latency percentiles

### Key Metrics to Track

```promql
# Request rate
rate(http_request_duration_seconds_count[5m])

# Error rate (5xx responses)
rate(http_requests_total{status=~"5.."}[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Span count from OTEL Collector
otelcol_exporter_sent_spans
```

## Performance Considerations

### Overhead
- **CPU**: ~0.5-1% per 10,000 requests
- **Memory**: ~50MB for tracer provider + spans
- **Network**: ~500 bytes per span exported

### Optimization Tips

1. **Sampling**: Only trace a percentage of requests
   ```javascript
   // In production, sample 10% of traces
   OTEL_TRACES_SAMPLER=parentbased_traceidratio
   OTEL_TRACES_SAMPLER_ARG=0.1
   ```

2. **Batch Exporting**: Group spans before sending
   ```javascript
   tracerProvider.addSpanProcessor(
     new BatchSpanProcessor(otlpExporter, {
       maxQueueSize: 2048,
       maxExportBatchSize: 512,
       scheduledDelayMillis: 5000
     })
   );
   ```

3. **Selective Logging**: Don't log everything
   ```javascript
   // Only log errors and important events
   if (error || isImportantEvent) {
     logger.error(message, user, ip, details);
   }
   ```

## Troubleshooting

### Spans Not Exported

**Problem**: Traces show in logs but not in Grafana

**Solution**:
1. Check OTLP endpoint: `curl http://localhost:4318/v1/traces`
2. Verify environment variable: `echo $OTEL_EXPORTER_OTLP_ENDPOINT`
3. Check collector logs: `docker logs otel-collector`
4. Ensure Tempo is running: `curl http://localhost:3200/api/status`

### trace_id Shows "no-trace"

**Problem**: Logs don't have trace_id values

**Solution**:
1. Ensure OTEL middleware is enabled (line 28 in server.js)
2. Check if session is initialized before logging
3. Verify logger.setTraceContext() is called

### High Memory Usage

**Problem**: Application memory keeps growing

**Solution**:
1. Reduce span count per request
2. Implement sampling
3. Add memory limit to span processor
4. Check for span processor memory leaks

### OTEL Collector Not Receiving Data

**Problem**: No spans reaching the collector

**Solution**:
1. Check app is configured with correct endpoint
2. Verify network connectivity: `telnet localhost 4318`
3. Enable debug logging: `OTEL_LOG_LEVEL=debug`
4. Check firewall rules

## Best Practices

### 1. Use Meaningful Span Names
```javascript
// Good - specific and actionable
span.name = 'POST /api/orders/checkout'

// Bad - too generic
span.name = 'request'
```

### 2. Add Custom Attributes
```javascript
// Always add context for better debugging
span.setAttributes({
  'user.id': userId,
  'order.id': orderId,
  'order.total': price,
  'payment.method': paymentMethod,
});
```

### 3. Record Exceptions
```javascript
try {
  // operation
} catch (error) {
  span.recordException(error); // Auto-captured
  span.setStatus({ code: 2 }); // ERROR
  throw; // Needed for outer handlers
}
```

### 4. Correlate with Logs
```javascript
// Always pass trace context to logs
logger.action('ORDER_PLACED', userId, ip, {
  orderId: order.id,
  trace_id: req.traceContext.traceId // For manual inclusion if needed
});
```

### 5. Monitor SLOs
```javascript
// Track performance
const span = tracer.startSpan('database.query');
const start = Date.now();

try {
  const result = await db.query(sql);
  span.setAttributes({
    'db.rows_returned': result.length,
    'db.duration_ms': Date.now() - start,
  });
} catch (e) {
  span.recordException(e);
}
```

## Next Steps

1. **Start collecting traces**: Run `npm start` and make requests
2. **View in Grafana**: 
   - `docker-compose up -d` (if using Docker)
   - Open http://localhost:3000
   - Explore traces by service name
3. **Create dashboards**: Build custom Grafana dashboards for your metrics
4. **Set up alerts**: Configure alerts on error rates or latency
5. **Export to production**: Configure your production OTLP endpoint

## References

- [OpenTelemetry Official Docs](https://opentelemetry.io/docs/)
- [OpenTelemetry JavaScript SDK](https://github.com/open-telemetry/opentelemetry-js)
- [OTLP Specification](https://opentelemetry.io/docs/specs/otel/protocol/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [OTEL Best Practices](https://opentelemetry.io/docs/guides/sampling/)
- [Distributed Tracing Guide](DISTRIBUTED_TRACING.md)
- [Docker & Grafana Setup](DOCKER_GRAFANA_SETUP.md)

## Related Documentation

- [Distributed Tracing Architecture](DISTRIBUTED_TRACING.md)
- [Docker Setup Guide](DOCKER_GRAFANA_SETUP.md)
- [JSON Logging System](README.md#logging)
- [Application README](README.md)

## Support & Contributing

For issues or improvements to the OTEL integration:
1. Check existing traces in logs for debugging info
2. Enable debug logging: `OTEL_LOG_LEVEL=debug`
3. Review OTEL Collector logs
4. Check Grafana datasource connectivity

## License

OpenTelemetry is under Apache 2.0 License. See [OTEL License](https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE).
