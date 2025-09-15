FROM node:18-alpine

# Arbeitsverzeichnis setzen
WORKDIR /app

# Package-Dateien kopieren
COPY package*.json ./

# Dependencies installieren
RUN npm ci --only=production

# Anwendungscode kopieren
COPY . .

# Port freigeben
EXPOSE 4000

# Health Check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/ || exit 1

# Benutzer für Sicherheit erstellen
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Ownership ändern
RUN chown -R nodejs:nodejs /app
USER nodejs

# Anwendung starten
CMD ["npm", "start"]
