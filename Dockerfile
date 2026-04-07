FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Set environment variables for OTLP export
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
ENV OTEL_SERVICE_NAME=demo-ecom-app
ENV DEPLOYMENT_ENV=development

# Start the application
CMD ["npm", "start"]
