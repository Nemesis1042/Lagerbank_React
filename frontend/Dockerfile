# Build Stage
FROM node:18-alpine as build

WORKDIR /app

# Package-Dateien kopieren
COPY package*.json ./

# Dependencies installieren
RUN npm ci

# Anwendungscode kopieren
COPY . .

# Build erstellen
RUN npm run build

# Production Stage
FROM nginx:alpine

# Build-Dateien kopieren
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx-Konfiguration kopieren
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Port freigeben
EXPOSE 80

# Health Check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Nginx starten
CMD ["nginx", "-g", "daemon off;"]
