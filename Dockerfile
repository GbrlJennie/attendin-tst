# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* yarn.lock* ./

RUN npm ci || yarn install --frozen-lockfile

COPY . .

RUN npm run build || yarn build

# Production stage
FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/

# Copy built files
COPY --from=build /app/dist .

EXPOSE 2828

CMD ["nginx", "-g", "daemon off;"]