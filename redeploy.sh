#!/bin/bash

################################################################################
# Ekasi Cart Shop API Redeployment Script
#
# Quick redeployment script for pulling latest changes and restarting the app
#
# Usage:
#   chmod +x redeploy.sh
#   sudo ./redeploy.sh
################################################################################

set -e  # Exit on error

################################################################################
# CONFIGURATION
################################################################################

APP_NAME="ekasi-cart-shop-api"
REPO_DIR="/var/www/ekasicart-shop-api"  # Repository root directory
GIT_BRANCH="main"  # Update if using different branch

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
# MAIN REDEPLOYMENT PROCESS
################################################################################

main() {
    echo ""
    echo "========================================================================"
    log_info "Starting Ekasi Cart Shop API Redeployment"
    echo "========================================================================"
    echo ""

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        log_error "This script must be run as root. Use: sudo ./redeploy.sh"
        exit 1
    fi

    # Check if repository directory exists
    if [ ! -d "$REPO_DIR" ]; then
        log_error "Repository directory not found: $REPO_DIR"
        log_error "Please run the initial deploy.sh script first."
        exit 1
    fi

    # Determine APP_DIR (shop-api subdirectory)
    if [ -d "$REPO_DIR/shop-api" ]; then
        APP_DIR="$REPO_DIR/shop-api"
        log_info "Using application directory: $APP_DIR"
    else
        log_error "shop-api directory not found in repository!"
        exit 1
    fi

    # Step 1: Show current status
    log_step "Current Application Status:"
    pm2 describe $APP_NAME 2>/dev/null || log_warn "Application not running in PM2"
    echo ""

    # Step 2: Navigate to repository root for git operations
    cd $REPO_DIR

    # Step 3: Stash any local changes (safety measure)
    log_step "Checking for local changes..."
    if [[ -n $(git status -s) ]]; then
        log_warn "Local changes detected. Creating backup..."
        git stash push -m "Auto-stash before redeploy $(date +%Y-%m-%d_%H:%M:%S)"
        log_info "Changes stashed. View with: git stash list"
    else
        log_info "No local changes detected."
    fi
    echo ""

    # Step 4: Pull latest changes
    log_step "Pulling latest changes from $GIT_BRANCH..."
    CURRENT_COMMIT=$(git rev-parse HEAD)
    git fetch origin
    git pull origin $GIT_BRANCH

    NEW_COMMIT=$(git rev-parse HEAD)

    if [ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]; then
        log_info "No new changes in repository. Already up to date."
    else
        log_info "Updated from $CURRENT_COMMIT to $NEW_COMMIT"
        echo ""
        log_info "Recent commits:"
        git log --oneline --graph --decorate -5
    fi
    echo ""

    # Step 5: Check if package.json changed
    log_step "Checking for dependency changes..."
    PACKAGE_JSON_CHANGED=false
    if git diff --name-only $CURRENT_COMMIT $NEW_COMMIT | grep -q "shop-api/package.json"; then
        PACKAGE_JSON_CHANGED=true
    fi

    # Step 6: Check if .env.example changed
    if git diff --name-only $CURRENT_COMMIT $NEW_COMMIT | grep -q "shop-api/.env.example"; then
        log_warn ".env.example has been updated!"
        log_warn "Please review and update your .env file if needed:"
        log_warn "  diff $APP_DIR/.env.example $APP_DIR/.env"
    fi
    echo ""

    # Step 7: Navigate to application directory
    cd $APP_DIR

    # Step 8: Install dependencies if package.json changed
    if [ "$PACKAGE_JSON_CHANGED" = true ]; then
        log_info "package.json changed. Updating dependencies..."
        npm install
        log_info "Dependencies updated."
    else
        log_info "No dependency changes detected."
    fi
    echo ""

    # Step 9: Check if source code changed (requires rebuild)
    log_step "Checking if rebuild is needed..."
    CODE_CHANGED=false
    if git diff --name-only $CURRENT_COMMIT $NEW_COMMIT | grep -q "shop-api/src/\|shop-api/tsconfig.json\|shop-api/nest-cli.json"; then
        CODE_CHANGED=true
    fi

    # Step 10: Rebuild application if code changed or dependencies updated
    if [ "$CODE_CHANGED" = true ] || [ "$PACKAGE_JSON_CHANGED" = true ] || [ "$CURRENT_COMMIT" != "$NEW_COMMIT" ]; then
        log_step "Rebuilding NestJS application..."

        # Clean previous build
        rm -rf dist/

        # Run build
        npm run build

        # Verify build output
        if [ ! -f "dist/main.js" ]; then
            log_error "Build failed! dist/main.js not found."
            exit 1
        fi

        log_info "Application rebuilt successfully."
    else
        log_info "No code changes detected. Skipping rebuild."
    fi
    echo ""

    # Step 11: Restart application
    log_step "Restarting application with PM2..."

    if pm2 describe $APP_NAME &>/dev/null; then
        pm2 restart $APP_NAME --update-env
        log_info "Application restarted successfully."
    else
        log_warn "Application not found in PM2. Starting new instance..."
        if [ -f "ecosystem.config.js" ]; then
            pm2 start ecosystem.config.js
            pm2 save
            log_info "Application started successfully."
        else
            log_error "ecosystem.config.js not found. Cannot start application."
            exit 1
        fi
    fi
    echo ""

    # Step 12: Show updated status
    log_step "Updated Application Status:"
    pm2 status
    echo ""

    # Step 13: Reload Nginx (in case of config changes)
    if systemctl is-active --quiet nginx; then
        log_step "Reloading Nginx..."
        nginx -t && systemctl reload nginx
        log_info "Nginx reloaded successfully."
    fi
    echo ""

    # Step 14: Display logs (last 20 lines)
    log_step "Recent Application Logs:"
    pm2 logs $APP_NAME --lines 20 --nostream
    echo ""

    # Success summary
    echo "========================================================================"
    log_info "Redeployment Complete!"
    echo "========================================================================"
    echo ""
    log_info "Summary:"
    echo "  - Git Branch: $GIT_BRANCH"
    echo "  - Commit: $NEW_COMMIT"
    echo "  - Application: $APP_NAME"
    echo "  - Status: $(pm2 describe $APP_NAME 2>/dev/null | grep 'status' | awk '{print $4}' || echo 'Unknown')"
    echo ""
    log_info "Useful Commands:"
    echo "  - View logs: pm2 logs $APP_NAME"
    echo "  - Monitor: pm2 monit"
    echo "  - Stop app: pm2 stop $APP_NAME"
    echo "  - Restart app: pm2 restart $APP_NAME"
    echo ""
}

# Run main function
main "$@"
