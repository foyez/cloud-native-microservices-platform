FROM node:24-alpine3.22

# Update apk packages to reduce vulnerabilities
RUN apk update && apk upgrade

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

EXPOSE 8000

CMD ["node", "index.js"]