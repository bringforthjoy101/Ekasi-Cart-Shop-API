#!/bin/bash

################################################################################
# Ekasi Cart Shop API Deployment Script for EC2
#
# This script automates the deployment of the Ekasi Cart Shop API (NestJS) on a
# Linux-based EC2 instance with PM2 process management and Nginx reverse proxy.
#
# Usage:
#   1. Update the configuration variables below
#   2. Make executable: chmod +x deploy.sh
#   3. Run: sudo ./deploy.sh
#
# Requirements:
#   - Ubuntu 20.04+ or Amazon Linux 2
#   - Root/sudo access
#   - Git repository access
#   - Main API (Cellerhut) must be accessible
################################################################################

set -e  # Exit on error

################################################################################
# CONFIGURATION - UPDATE THESE VALUES
################################################################################

# Git Configuration
GIT_REPO_URL="git@github.com:bringforthjoy101/Ekasi-Cart-Shop-API.git"  # SSH URL (recommended) or HTTPS
GIT_BRANCH="main"  # or "master", "production", etc.

# Domain Configuration
DOMAIN_NAME="shop-api.ekasicart.com"  # Update with your domain
API_PORT=3001  # Port the shop-api runs on

# Application Configuration
APP_NAME="ekasi-cart-shop-api"
REPO_DIR="/var/www/ekasicart-shop-api"  # Repository root
APP_USER="ubuntu"  # User to run the application (ubuntu for AWS EC2)

# PM2 Configuration
PM2_INSTANCES="max"  # 'max' for all CPUs, or specific number (e.g., 2)

# SSL Configuration
ENABLE_SSL=true  # Set to false to skip SSL setup
SSL_EMAIL="admin@ekasicart.com"  # Email for Let's Encrypt

# Node.js Version
NODE_VERSION="20"  # LTS version required by NestJS

# Main API Configuration (Required for shop-api to function)
MAIN_API_URL="https://api.ekasicart.com"  # Update with your main API URL

################################################################################
# COLOR OUTPUT
################################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

################################################################################
# DETECT LINUX DISTRIBUTION
################################################################################

detect_os() {
    log_info "Detecting Linux distribution..."

    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
        log_info "Detected: $OS $VERSION"
    else
        log_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
}

################################################################################
# INSTALL GIT
################################################################################

install_git() {
    log_info "Checking Git installation..."

    if command -v git &> /dev/null; then
        log_info "Git is already installed. Version: $(git --version)"
        return
    fi

    log_info "Installing Git..."
    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        apt-get install -y git
    elif [[ "$OS" == "amzn" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]]; then
        yum install -y git
    fi

    log_info "Git installed successfully. Version: $(git --version)"
}

################################################################################
# VERIFY SSH ACCESS FOR GIT
################################################################################

verify_ssh_access() {
    log_info "Verifying SSH access for Git repository..."

    # Check if using SSH URL
    if [[ ! "$GIT_REPO_URL" =~ ^git@ ]]; then
        log_info "Using HTTPS URL. Skipping SSH verification."
        return 0
    fi

    # Extract hostname from SSH URL
    SSH_HOST=$(echo $GIT_REPO_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')

    if [ -z "$SSH_HOST" ]; then
        log_error "Could not extract SSH host from URL: $GIT_REPO_URL"
        exit 1
    fi

    log_info "Git SSH host detected: $SSH_HOST"

    # Check for SSH keys
    SSH_KEY_FOUND=false
    if [ -f "/home/$APP_USER/.ssh/id_rsa" ]; then
        SSH_KEY_FOUND=true
        SSH_KEY_TYPE="RSA"
        SSH_KEY_PATH="/home/$APP_USER/.ssh/id_rsa"
    elif [ -f "/home/$APP_USER/.ssh/id_ed25519" ]; then
        SSH_KEY_FOUND=true
        SSH_KEY_TYPE="Ed25519"
        SSH_KEY_PATH="/home/$APP_USER/.ssh/id_ed25519"
    fi

    if [ "$SSH_KEY_FOUND" = false ]; then
        log_error "No SSH key found for user $APP_USER!"
        log_error "SSH keys are required for git clone to access the repository."
        echo ""
        log_error "Please generate an SSH key first:"
        echo "  1. Exit this script (Ctrl+C)"
        echo "  2. Switch to $APP_USER and generate key:"
        echo "     sudo -u $APP_USER ssh-keygen -t ed25519 -C 'your_email@example.com'"
        echo "  3. Add the public key to GitHub"
        echo "  4. Re-run this deployment script"
        exit 1
    fi

    log_info "SSH key found: $SSH_KEY_PATH ($SSH_KEY_TYPE)"

    # Fix permissions
    chmod 600 "$SSH_KEY_PATH"
    chmod 700 "/home/$APP_USER/.ssh"

    # Add host to known_hosts
    if ! grep -q "$SSH_HOST" "/home/$APP_USER/.ssh/known_hosts" 2>/dev/null; then
        log_info "Adding $SSH_HOST to known_hosts..."
        mkdir -p "/home/$APP_USER/.ssh"
        ssh-keyscan -H "$SSH_HOST" >> "/home/$APP_USER/.ssh/known_hosts" 2>/dev/null
        chown -R $APP_USER:$APP_USER "/home/$APP_USER/.ssh"
    fi

    # Test SSH connection
    log_info "Testing SSH connection to $SSH_HOST..."
    if sudo -u $APP_USER ssh -T git@$SSH_HOST -o StrictHostKeyChecking=no 2>&1 | grep -q "successfully authenticated\|You've successfully authenticated"; then
        log_info "SSH authentication successful!"
    else
        SSH_TEST_OUTPUT=$(sudo -u $APP_USER ssh -T git@$SSH_HOST -o StrictHostKeyChecking=no 2>&1)
        if echo "$SSH_TEST_OUTPUT" | grep -q "successfully authenticated\|You've successfully authenticated\|Hi "; then
            log_info "SSH authentication successful!"
        else
            log_error "SSH authentication failed!"
            exit 1
        fi
    fi
}

################################################################################
# SYSTEM UPDATE
################################################################################

update_system() {
    log_info "Updating system packages..."

    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        apt-get update -y
        apt-get upgrade -y
    elif [[ "$OS" == "amzn" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]]; then
        yum update -y
    else
        log_error "Unsupported OS: $OS"
        exit 1
    fi
}

################################################################################
# INSTALL NODE.JS
################################################################################

install_nodejs() {
    log_info "Installing Node.js ${NODE_VERSION}..."

    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        CURRENT_NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$CURRENT_NODE_VERSION" == "$NODE_VERSION" ]; then
            log_info "Node.js ${NODE_VERSION} is already installed."
            return
        fi
    fi

    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
        apt-get install -y nodejs
    elif [[ "$OS" == "amzn" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
        yum install -y nodejs
    fi

    log_info "Node.js version: $(node -v)"
    log_info "npm version: $(npm -v)"
}

################################################################################
# INSTALL PM2
################################################################################

install_pm2() {
    log_info "Installing PM2 globally..."

    if command -v pm2 &> /dev/null; then
        log_info "PM2 is already installed. Version: $(pm2 -v)"
        npm install -g pm2@latest
    else
        npm install -g pm2
    fi

    # Configure PM2 to start on system boot
    log_info "Configuring PM2 startup..."
    env PATH=$PATH:/usr/bin pm2 startup systemd -u $APP_USER --hp /home/$APP_USER || true
}

################################################################################
# INSTALL NGINX
################################################################################

install_nginx() {
    log_info "Installing Nginx..."

    if command -v nginx &> /dev/null; then
        log_info "Nginx is already installed."
        return
    fi

    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        apt-get install -y nginx
    elif [[ "$OS" == "amzn" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]]; then
        amazon-linux-extras install nginx1 -y || yum install -y nginx
    fi

    # Start and enable Nginx
    systemctl start nginx
    systemctl enable nginx

    log_info "Nginx installed and started."
}

################################################################################
# INSTALL CERTBOT (for SSL)
################################################################################

install_certbot() {
    if [ "$ENABLE_SSL" != true ]; then
        log_info "SSL is disabled. Skipping Certbot installation."
        return
    fi

    log_info "Installing Certbot for SSL certificates..."

    if command -v certbot &> /dev/null; then
        log_info "Certbot is already installed."
        return
    fi

    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        apt-get install -y certbot python3-certbot-nginx
    elif [[ "$OS" == "amzn" ]] || [[ "$OS" == "centos" ]] || [[ "$OS" == "rhel" ]]; then
        yum install -y certbot python3-certbot-nginx
    fi
}

################################################################################
# CLONE OR UPDATE GIT REPOSITORY
################################################################################

setup_application() {
    log_info "Setting up application directory..."

    # Create repo directory if it doesn't exist
    if [ ! -d "$REPO_DIR" ]; then
        log_info "Creating repository directory: $REPO_DIR"
        mkdir -p $REPO_DIR
        chown -R $APP_USER:$APP_USER $REPO_DIR
    fi

    # Clone or pull repository
    if [ -d "$REPO_DIR/.git" ]; then
        log_info "Repository exists. Pulling latest changes..."
        cd $REPO_DIR
        sudo -u $APP_USER git fetch origin
        sudo -u $APP_USER git reset --hard origin/$GIT_BRANCH
        sudo -u $APP_USER git pull origin $GIT_BRANCH
    else
        log_info "Cloning repository from $GIT_REPO_URL..."
        rm -rf $REPO_DIR/*
        chown -R $APP_USER:$APP_USER $REPO_DIR
        sudo -u $APP_USER git clone -b $GIT_BRANCH $GIT_REPO_URL $REPO_DIR
    fi

    # Navigate to shop-api directory
    if [ -d "$REPO_DIR" ]; then
        log_info "Found shop-api subdirectory. Using $REPO_DIR as application root."
        APP_DIR="$REPO_DIR"
        cd $APP_DIR
    else
        log_error "shop-api directory not found in repository!"
        exit 1
    fi
}

################################################################################
# CREATE .ENV FILE
################################################################################

setup_environment() {
    log_info "Setting up environment variables..."

    cd $APP_DIR

    if [ -f .env ]; then
        log_warn ".env file already exists. Creating backup..."
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi

    if [ -f .env.example ]; then
        log_info "Copying .env.example to .env"
        cp .env.example .env
        log_warn "IMPORTANT: You must update .env with your actual credentials!"
        log_warn "Edit the file: nano $APP_DIR/.env"
    else
        log_warn ".env.example not found. You must create .env manually."
    fi

    # Ensure production environment
    if [ -f .env ]; then
        # Set NODE_ENV
        if grep -q "NODE_ENV=" .env; then
            sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env
        else
            echo "NODE_ENV=production" >> .env
        fi

        # Set PORT
        if grep -q "PORT=" .env; then
            sed -i "s/PORT=.*/PORT=$API_PORT/" .env
        else
            echo "PORT=$API_PORT" >> .env
        fi

        # Set CELLER_HUT_API_URL
        if grep -q "CELLER_HUT_API_URL=" .env; then
            sed -i "s|CELLER_HUT_API_URL=.*|CELLER_HUT_API_URL=$MAIN_API_URL|" .env
        else
            echo "CELLER_HUT_API_URL=$MAIN_API_URL" >> .env
        fi
    fi
}

################################################################################
# INSTALL NPM DEPENDENCIES
################################################################################

install_dependencies() {
    log_info "Installing npm dependencies..."

    cd $APP_DIR

    # Clear npm cache
    npm cache clean --force || true

    # Install all dependencies (NestJS needs all deps, not just production)
    npm install

    log_info "Dependencies installed successfully."
}

################################################################################
# BUILD NESTJS APPLICATION
################################################################################

build_application() {
    log_info "Building NestJS application (TypeScript compilation)..."

    cd $APP_DIR

    # Clean previous build
    rm -rf dist/

    # Run build
    npm run build

    # Verify build output
    if [ ! -f "dist/main.js" ]; then
        log_error "Build failed! dist/main.js not found."
        exit 1
    fi

    log_info "Application built successfully. Output: dist/main.js"
}

################################################################################
# CREATE PM2 ECOSYSTEM FILE
################################################################################

create_pm2_ecosystem() {
    log_info "Creating PM2 ecosystem file..."

    cd $APP_DIR

    # Check if ecosystem.config.js already exists
    if [ -f ecosystem.config.js ]; then
        log_info "ecosystem.config.js already exists. Skipping creation."
        return
    fi

    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${APP_NAME}',
    script: './dist/main.js',
    instances: '${PM2_INSTANCES}',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: ${API_PORT}
    },
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
    error_file: '/var/log/pm2/${APP_NAME}-error.log',
    out_file: '/var/log/pm2/${APP_NAME}-out.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    shutdown_with_message: true
  }]
};
EOF

    log_info "PM2 ecosystem file created at $APP_DIR/ecosystem.config.js"
}

################################################################################
# VERIFY MAIN API CONNECTIVITY
################################################################################

verify_main_api() {
    log_info "Verifying Main API connectivity..."

    if curl -s --head --fail "$MAIN_API_URL" > /dev/null 2>&1; then
        log_info "✓ Main API is accessible at: $MAIN_API_URL"
    else
        log_warn "Main API at $MAIN_API_URL is not accessible!"
        log_warn "Shop API requires the Main API to be running."
        log_warn "Please ensure Main API is deployed and accessible."
        log_warn "Continuing deployment, but shop-api may not function correctly."
    fi
}

################################################################################
# START APPLICATION WITH PM2
################################################################################

start_application() {
    log_info "Starting application with PM2..."

    cd $APP_DIR

    # Create PM2 logs directory
    mkdir -p /var/log/pm2

    # Stop existing PM2 process if running
    pm2 delete $APP_NAME 2>/dev/null || true

    # Start application
    pm2 start ecosystem.config.js

    # Save PM2 configuration
    pm2 save

    # Display status
    pm2 status

    log_info "Application started successfully."
}

################################################################################
# CONFIGURE NGINX
################################################################################

configure_nginx() {
    log_info "Configuring Nginx (HTTP-only initially)..."

    # Remove default site if exists
    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        rm -f /etc/nginx/sites-enabled/default
    fi

    # Create certbot directory for Let's Encrypt challenges
    mkdir -p /var/www/certbot

    # Create initial HTTP-only Nginx configuration
    cat > /etc/nginx/sites-available/$APP_NAME << 'EOF'
# Upstream configuration
upstream shop_api_backend {
    least_conn;
    server 127.0.0.1:API_PORT max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=shop_api_limit:10m rate=100r/s;

# HTTP server
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_NAME;

    # Client body size (for file uploads)
    client_max_body_size 50M;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Logging
    access_log /var/log/nginx/DOMAIN_NAME.access.log;
    error_log /var/log/nginx/DOMAIN_NAME.error.log warn;

    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    # Proxy to NestJS application
    location / {
        # Rate limiting
        limit_req zone=shop_api_limit burst=50 nodelay;

        # Proxy headers
        proxy_pass http://shop_api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Disable buffering
        proxy_buffering off;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://shop_api_backend;
    }
}
EOF

    # Replace placeholders
    sed -i "s/DOMAIN_NAME/$DOMAIN_NAME/g" /etc/nginx/sites-available/$APP_NAME
    sed -i "s/API_PORT/$API_PORT/g" /etc/nginx/sites-available/$APP_NAME

    # Enable site
    if [[ "$OS" == "ubuntu" ]] || [[ "$OS" == "debian" ]]; then
        ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    fi

    # Test and reload
    if nginx -t; then
        log_info "Nginx configuration test passed."
        systemctl reload nginx
        log_info "API is now accessible at: http://$DOMAIN_NAME"
    else
        log_error "Nginx configuration test failed!"
        exit 1
    fi
}

################################################################################
# VERIFY DNS CONFIGURATION
################################################################################

verify_dns() {
    log_step "Verifying DNS configuration for $DOMAIN_NAME..."

    SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || curl -s ipecho.net/plain)

    if [ -z "$SERVER_IP" ]; then
        log_warn "Could not determine server's public IP address."
        return 0
    fi

    log_info "Server IP: $SERVER_IP"

    if command -v dig &> /dev/null; then
        DOMAIN_IP=$(dig +short $DOMAIN_NAME A | head -n 1)
    elif command -v nslookup &> /dev/null; then
        DOMAIN_IP=$(nslookup $DOMAIN_NAME | grep 'Address:' | tail -n 1 | awk '{print $2}')
    else
        log_warn "No DNS lookup tools available."
        return 0
    fi

    if [ -z "$DOMAIN_IP" ]; then
        log_error "DNS verification failed: Could not resolve $DOMAIN_NAME"
        log_warn "SSL setup will be skipped."
        return 1
    fi

    if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
        log_info "✓ DNS verification passed: $DOMAIN_NAME points to this server"
        return 0
    else
        log_error "DNS verification failed!"
        log_error "  Domain resolves to: $DOMAIN_IP"
        log_error "  Server IP is: $SERVER_IP"
        log_warn "SSL setup will be skipped."
        return 1
    fi
}

################################################################################
# SETUP SSL WITH LET'S ENCRYPT
################################################################################

setup_ssl() {
    if [ "$ENABLE_SSL" != true ]; then
        log_info "SSL is disabled."
        return
    fi

    log_step "Setting up SSL with Let's Encrypt..."

    mkdir -p /var/www/certbot

    log_info "Obtaining SSL certificate for $DOMAIN_NAME..."

    if certbot certonly --webroot -w /var/www/certbot -d $DOMAIN_NAME \
        --non-interactive --agree-tos --email $SSL_EMAIL; then
        log_info "SSL certificate obtained successfully!"
    else
        log_error "Failed to obtain SSL certificate."
        log_warn "API will remain accessible via HTTP only."
        return 1
    fi

    # Update Nginx for HTTPS
    cat > /etc/nginx/sites-available/$APP_NAME << 'EOF'
upstream shop_api_backend {
    least_conn;
    server 127.0.0.1:API_PORT max_fails=3 fail_timeout=30s;
    keepalive 32;
}

limit_req_zone $binary_remote_addr zone=shop_api_limit:10m rate=100r/s;

# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_NAME;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_NAME;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_NAME/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/DOMAIN_NAME/chain.pem;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    client_max_body_size 50M;

    access_log /var/log/nginx/DOMAIN_NAME.access.log;
    error_log /var/log/nginx/DOMAIN_NAME.error.log warn;

    # Proxy to NestJS application
    location / {
        limit_req zone=shop_api_limit burst=50 nodelay;

        proxy_pass http://shop_api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    location /health {
        proxy_pass http://shop_api_backend;
        access_log off;
    }
}
EOF

    # Replace placeholders
    sed -i "s/DOMAIN_NAME/$DOMAIN_NAME/g" /etc/nginx/sites-available/$APP_NAME
    sed -i "s/API_PORT/$API_PORT/g" /etc/nginx/sites-available/$APP_NAME

    # Test and reload
    if nginx -t; then
        systemctl reload nginx
        log_info "✓ HTTPS enabled successfully!"
        log_info "API is now accessible at: https://$DOMAIN_NAME"
    else
        log_error "Nginx configuration test failed!"
        return 1
    fi

    # Setup auto-renewal
    (crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
}

################################################################################
# CONFIGURE FIREWALL
################################################################################

configure_firewall() {
    log_info "Configuring firewall..."

    if command -v ufw &> /dev/null; then
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        echo "y" | ufw enable || true
        log_info "UFW firewall configured."
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        log_info "Firewalld configured."
    fi
}

################################################################################
# SET PERMISSIONS
################################################################################

set_permissions() {
    log_info "Setting file permissions..."

    chown -R $APP_USER:$APP_USER $APP_DIR
    find $APP_DIR -type d -exec chmod 755 {} \;
    find $APP_DIR -type f -exec chmod 644 {} \;

    # Make dist/main.js executable
    chmod +x $APP_DIR/dist/main.js 2>/dev/null || true

    log_info "Permissions set successfully."
}

################################################################################
# DISPLAY SUMMARY
################################################################################

display_summary() {
    echo ""
    echo "========================================================================"
    log_info "Shop API Deployment Complete!"
    echo "========================================================================"
    echo ""
    log_info "Application Details:"
    echo "  - Name: $APP_NAME"
    echo "  - Directory: $APP_DIR"
    echo "  - Domain: $DOMAIN_NAME"
    echo "  - Port: $API_PORT"
    echo "  - Main API: $MAIN_API_URL"
    echo ""
    log_info "PM2 Status:"
    pm2 status
    echo ""
    log_info "Useful Commands:"
    echo "  - View logs: pm2 logs $APP_NAME"
    echo "  - Restart app: pm2 restart $APP_NAME"
    echo "  - Monitor: pm2 monit"
    echo "  - Nginx logs: tail -f /var/log/nginx/${DOMAIN_NAME}.error.log"
    echo "  - Redeploy: sudo $APP_DIR/redeploy.sh"
    echo ""
    log_warn "IMPORTANT NEXT STEPS:"
    echo "  1. Update .env file: nano $APP_DIR/.env"
    echo "  2. Set payment gateway keys (Stripe, PayPal)"
    echo "  3. Verify Main API connectivity"
    echo "  4. Test API: curl https://$DOMAIN_NAME/api"
    echo "  5. Check Swagger docs: https://$DOMAIN_NAME/docs"
    echo ""
    echo "========================================================================"
}

################################################################################
# MAIN EXECUTION
################################################################################

main() {
    log_info "Starting Ekasi Cart Shop API deployment..."
    echo ""

    # Check root
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root. Use: sudo ./deploy.sh"
        exit 1
    fi

    # Execute deployment steps
    detect_os
    update_system
    install_git
    verify_ssh_access
    install_nodejs
    install_pm2
    install_nginx
    install_certbot
    setup_application
    setup_environment
    install_dependencies
    build_application  # NestJS build step
    create_pm2_ecosystem
    set_permissions
    verify_main_api  # Check Main API connectivity
    start_application
    configure_nginx

    # SSL setup with DNS verification
    if [ "$ENABLE_SSL" = true ]; then
        if verify_dns; then
            setup_ssl
        fi
    fi

    configure_firewall
    systemctl reload nginx
    display_summary

    log_info "Deployment completed successfully!"
}

# Run main function
main "$@"
