# Lagerbank Basis-Installation auf Raspberry Pi

Diese Anleitung installiert alle benötigten Komponenten für die Lagerbank-Anwendung auf einem Raspberry Pi. Alles als ein Block zum einfachen Kopieren.

```bash
# 1. System aktualisieren
sudo apt update
sudo apt upgrade -y

# 2. Node.js (über NVM) installieren
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20

# 3. Git installieren
sudo apt install -y git

# 4. MariaDB installieren
sudo apt install -y mariadb-server mariadb-client
sudo mysql_secure_installation

# 5. Nginx installieren
sudo apt install -y nginx

# 6. Certbot für Let's Encrypt installieren
sudo apt install -y certbot python3-certbot-nginx

# 7. PM2 (Node.js Prozessmanager) installieren
npm install -g pm2

# 8. Optional: Firewall konfigurieren
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Fertig: Basisinstallation abgeschlossen
