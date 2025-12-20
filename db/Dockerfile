FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json ./

RUN npm install

# Copy migration code
COPY migrate.ts ./
COPY migrations ./migrations
COPY seeds ./seeds

# Build TypeScript
RUN npm run build

# Default command: run migrations
CMD ["npm", "run", "migrate"]
