FROM node:20-slim

WORKDIR /opt/outline

# Install build dependencies
RUN apt-get update && \
    apt-get install -y python3 build-essential wget && \
    rm -rf /var/lib/apt/lists/*

# Copy package files first for better caching
COPY package.json yarn.lock ./
RUN yarn install

# Copy the rest of the application
COPY . .

# Build the application
RUN yarn build

# Create directories for data storage
RUN mkdir -p /var/lib/outline/data && \
    chmod 1777 /var/lib/outline/data

VOLUME /var/lib/outline/data

HEALTHCHECK --interval=1m CMD wget -qO- "http://localhost:${PORT:-3000}/_health" | grep -q "OK" || exit 1

EXPOSE 3000
CMD ["yarn", "start"]