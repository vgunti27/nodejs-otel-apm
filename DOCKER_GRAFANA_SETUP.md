# Docker Setup for OpenTelemetry & Grafana

This guide explains how to run the demo ecommerce application with complete distributed tracing infrastructure using Docker.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐                                   │
│  │  Node.js App     │────┐                              │
│  │ (Port 3000)      │    │                              │
│  └──────────────────┘    │ OTLP/HTTP                    │
│                          │ (Port 4318)                  │
│  ┌──────────────────┐    │                              │
│  │  Client Browser  │    │                              │
│  │ (localhost:3000) │    │                              │
│  └──────────────────┘    │                              │
│                          ▼                              │
│                  ┌──────────────────┐                  │
│                  │  OTEL Collector  │                  │
│                  │ (Receives Traces)│                  │
│                  └────────┬─────────┘                  │
│                           │                             │
│                    ┌──────▼────────┐                   │
│                    │  Tempo        │                   │
│                    │  (Trace Store)│                   │
│                    └──────┬────────┘                   │
│                           │                             │
│            ┌──────────────┴──────────────┐             │
│            │                             │             │
│     ┌──────▼──────┐           ┌─────────▼──┐          │
│     │  Prometheus │           │   Grafana   │          │
│     │  (Metrics)  │           │(Dashboards) │          │
│     └─────────────┘           └─────────────┘          │
│            │                        ▲                   │
│            └────────────────────────┘                  │
│                                                          │
│     ┌─────────────┐                                    │
│     │    Loki     │◄────────────────────────┐          │
│     │(Log Storage)│                         │          │
│     └─────────────┘                         │          │
│                                       (Optional)        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Option 1: Grafana + Tempo Only (Lightweight)

```bash
# Start only the monitoring infrastructure (no Node.js app)
docker-compose up -d

# Access Grafana
open http://localhost:3000
```

Then run the Node.js app locally:
```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npm start
```

### Option 2: Complete Stack (Everything in Docker)

```bash
# Build and start all services including the Node.js app
docker-compose -f docker-compose.full.yml up --build

# Access services
Grafana:     http://localhost:3001
App:         http://localhost:3000
Tempo:       http://localhost:3200
Prometheus:  http://localhost:9090
OTEL ZPages: http://localhost:55679
```

## Services

### 1. Node.js Application (docker-compose.full.yml only)
- **Port**: 3000
- **Role**: Demo ecommerce app with OTEL instrumentation
- **Traces**: Automatically exported to OTEL Collector

### 2. OpenTelemetry Collector
- **Port**: 4318 (OTLP/HTTP), 4317 (OTLP/gRPC)
- **Role**: Receives traces and forwards to Tempo
- **Config**: `otel-collector-config.yml`

### 3. Grafana Tempo
- **Port**: 3200
- **Role**: Stores and queries traces
- **Storage**: Local file-based (`/var/tempo/traces`)
- **Config**: `tempo.yml`

### 4. Prometheus
- **Port**: 9090
- **Role**: Metrics collection and storage
- **Config**: `prometheus.yml`
- **Use**: Powers service maps and metrics in Grafana

### 5. Grafana
- **Port**: 3000 (docker-compose.yml) or 3001 (docker-compose.full.yml)
- **Default Login**: admin/admin
- **Role**: Visualization platform
- **Datasources**: Automatically configured (Tempo, Prometheus, Loki)

### 6. Loki (Optional)
- **Port**: 3100
- **Role**: Log aggregation (for correlating logs with traces)
- **Use**: Optional, can be removed if not needed

## Usage Workflows

### Workflow 1: Generate Traces

1. **Start infrastructure**:
   ```bash
   docker-compose up -d
   ```

2. **Run app locally**:
   ```bash
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npm start
   ```

3. **Generate traffic**:
   ```bash
   # Login flow
   curl -X POST http://localhost:3000/login \
     -d "username=admin&password=admin" \
     -H "Content-Type: application/x-www-form-urlencoded"
   
   # View products
   curl http://localhost:3000/products
   
   # Add to cart
   curl -X POST http://localhost:3000/add-to-cart \
     -d "productId=1&quantity=2" \
     -H "Content-Type: application/x-www-form-urlencoded"
   ```

4. **View in Grafana**:
   - Open http://localhost:3000
   - Go to Explore > Select Tempo datasource
   - Search by service: `demo-ecom-app`
   - Click trace to see spans

### Workflow 2: View Service Map

1. Ensure traces are being collected
2. In Grafana, go to Explore > Tempo
3. Select "Service Map" view
4. See: demo-ecom-app service with request flows

### Workflow 3: Analyze Performance

1. In Grafana, go to Explore > Prometheus
2. Query: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))`
3. View 95th percentile response times
4. Correlate with traces to find bottlenecks

## Configuration Files

### otel-collector-config.yml
- Defines OTLP receivers (gRPC, HTTP)
- Configures batch processing
- Exports to Tempo and logging

### tempo.yml
- In-memory storage configuration
- Query settings
- WAL settings for durability

### prometheus.yml
- Scrape interval: 15s
- Monitors: OTEL Collector, Grafana, Tempo

### grafana-datasources.yml
- Auto-configures Tempo, Prometheus, Loki
- Enables service maps and node graphs

## Environment Variables

### For Node.js App
```bash
# Send traces to OTEL Collector
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318

# Service identification
OTEL_SERVICE_NAME=demo-ecom-app

# Environment
DEPLOYMENT_ENV=development
```

### For Running Outside Docker
```bash
# When running locally against Docker containers
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 npm start
```

## Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3000 (or 3001) | admin/admin |
| Tempo | http://localhost:3200 | - |
| Prometheus | http://localhost:9090 | - |
| OTEL ZPages | http://localhost:55679 | - |
| Node.js App | http://localhost:3000 | admin/admin |

## Docker Commands

### Start Services

```bash
# Infrastructure only (lightweight)
docker-compose up -d

# Full stack with Node.js
docker-compose -f docker-compose.full.yml up --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes (reset data)
docker-compose down -v
```

### Useful Docker Commands

```bash
# View running services
docker ps

# Inspect a service
docker inspect tempo

# View service logs
docker logs otel-collector
docker logs tempo
docker logs grafana

# Access shell in container
docker exec -it grafana bash

# Check service connectivity
docker exec nodejs-app curl http://otel-collector:4318/v1/traces
```

## Troubleshooting

### Traces Not Appearing in Grafana

1. **Check OTEL Collector is receiving traces**:
   ```bash
   docker logs otel-collector | grep "span"
   ```

2. **Verify Tempo is running**:
   ```bash
   curl http://localhost:3200/api/status
   ```

3. **Check app is exporting**:
   ```bash
   docker logs nodejs-app | grep "OTLP\|trace"
   ```

4. **Verify network connectivity**:
   ```bash
   # If running app locally
   curl http://localhost:4318/v1/traces
   ```

### Grafana Can't Connect to Tempo

1. **Check datasource configuration**:
   - Go to Grafana > Configuration > Data Sources
   - Click Tempo datasource
   - Test connection

2. **Verify Tempo is healthy**:
   ```bash
   docker exec tempo curl http://localhost:3200/api/status
   ```

3. **Check network**:
   ```bash
   docker network ls
   docker network inspect otel-network
   ```

### High CPU/Memory Usage

1. **Reduce OTEL Collector batch size**:
   ```yaml
   processors:
     batch:
       send_batch_size: 512  # Reduce from 1024
   ```

2. **Reduce Prometheus scrape interval**:
   ```yaml
   global:
     scrape_interval: 30s  # Increase from 15s
   ```

3. **Limit Tempo memory**:
   ```bash
   docker run -m 512m ...
   ```

## Performance Monitoring

### Built-in Dashboards

Grafana includes dashboards for:
- **Tempo**: Trace query performance
- **Prometheus**: Scrape targets and metrics
- **Loki**: Log volume and errors

### Custom Metrics to Track

```promql
# Request rate
rate(http_request_duration_seconds_count[5m])

# Error rate
rate(http_request_duration_seconds_count{http_status_code=~"5.."}[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# OTEL Collector pipeline performance
otelcol_exporter_sent_spans{exporter="otlp"}
```

## Advanced: Multi-Region Traces

For microservices, propagate trace context via W3C headers:

```javascript
// Send trace context in headers
const headers = {
  'traceparent': span.spanContext().traceParent,
  'tracestate': span.spanContext().traceState,
};
```

All services using OpenTelemetry will automatically propagate the same trace_id.

## Cleanup

```bash
# Stop all containers
docker-compose down

# Remove all data
docker-compose down -v

# Remove images
docker image rm otel/opentelemetry-collector-contrib grafana/tempo prom/prometheus grafana/grafana

# Full cleanup
docker system prune -a
```

## Next Steps

1. **Configure your Grafana installation** with custom dashboards
2. **Set up alerts** on error rates or latencies
3. **Export traces** to production (change OTLP endpoint)
4. **Integrate with CI/CD** to send build traces
5. **Monitor multiple services** by configuring each service's OTEL endpoint

## References

- [Grafana Tempo Documentation](https://grafana.com/docs/tempo/latest/)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/reference/specification/protocol/exporter/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
