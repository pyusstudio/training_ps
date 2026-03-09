FROM node:20-alpine AS build

WORKDIR /app

# Accept build arguments for Vite
ARG VITE_BACKEND_URL
ARG VITE_BACKEND_WS_URL

# Set as environment variables for the build process
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_BACKEND_WS_URL=$VITE_BACKEND_WS_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# Use sed to replace the default Nginx port with the PORT environment variable provided by Render
CMD sed -i -e 's/listen  *80;/listen '"${PORT:-80}"';/g' /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"
