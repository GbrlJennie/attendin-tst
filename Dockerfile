# Multi-stage Dockerfile for Vite React App (portal-queenify)
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* ./
RUN npm ci || yarn install --frozen-lockfile
COPY . .
RUN npm run build || yarn build

# Production stage (using nginx)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist .
# Copy custom nginx config if needed (uncomment if you have one)
# COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 3080 for compatibility with your scripts
EXPOSE 3080

# Serve on port 3080 (nginx default is 80, so remap)
CMD ["nginx", "-g", "daemon off;"]
