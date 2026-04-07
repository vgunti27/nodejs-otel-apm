const { BasicTracerProvider, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { trace, context, propagation } = require('@opentelemetry/api');
const { W3CTraceContextPropagator } = require('@opentelemetry/core');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

// Create resource with service information
const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: 'demo-ecom-app',
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  'deployment.environment': process.env.DEPLOYMENT_ENV || 'development',
});

// Create tracer provider with resource
const tracerProvider = new BasicTracerProvider({
  resource: resource,
});

// Set up W3C Trace Context propagator for distributed tracing
const propagator = new W3CTraceContextPropagator();
propagation.setGlobalPropagator(propagator);

// Set up OTLP exporter for Grafana/Jaeger integration
try {
  const otlpExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  });
  
  // Add span processor only if exporter is available
  tracerProvider.addSpanProcessor(new SimpleSpanProcessor(otlpExporter));
  console.log('✓ OTLP exporter configured');
} catch (err) {
  // OTLP exporter not available - continue anyway
  console.log('⚠ OTLP exporter not configured (optional for Grafana setup)');
}

// Set as global tracer provider
trace.setGlobalTracerProvider(tracerProvider);

console.log('✓ OpenTelemetry tracing initialized for demo-ecom-app');
console.log('  Service Name: demo-ecom-app');
console.log('  Environment: ' + (process.env.DEPLOYMENT_ENV || 'development'));
console.log('  Distributed Tracing: W3C Trace Context enabled');

process.on('SIGTERM', () => {
  tracerProvider.shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down successfully'))
    .catch((err) => console.error('Failed to shut down OpenTelemetry SDK', err))
    .finally(() => process.exit(0));
});

module.exports = { tracerProvider, resource, propagator };
