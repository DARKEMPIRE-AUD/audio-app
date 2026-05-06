FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Set environment
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=512

# Expose port
EXPOSE 10000

# Start the app
CMD ["node", "server.js"]
