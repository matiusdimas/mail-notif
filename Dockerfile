# Use Node.js 18 slim as base image
FROM node:18-slim

# Build tools needed to compile native modules (sqlite3)
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose the Web UI port
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ]
