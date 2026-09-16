# Production Dockerfile for Pashu Khadya Ledger
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy app source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Create persistent data directory for SQLite
RUN mkdir -p /app/backend/data && chown -R node:node /app

USER node

# Expose standard port
ENV PORT=5000
ENV NODE_ENV=production
EXPOSE 5000

# Start application
CMD ["node", "backend/src/server.js"]
