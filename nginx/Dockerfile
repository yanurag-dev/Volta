FROM nginx:alpine

# Install wget for healthchecks
RUN apk add --no-cache wget

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create directory for SSL certificates (optional, for future HTTPS)
RUN mkdir -p /etc/nginx/ssl

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
