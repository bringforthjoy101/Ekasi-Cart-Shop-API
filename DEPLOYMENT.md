# Ekasi Cart Shop API - AWS EC2 Deployment Guide

This guide provides step-by-step instructions for deploying the Shop API (NestJS middleware) to an AWS EC2 instance.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [AWS EC2 Setup](#aws-ec2-setup)
- [SSH Configuration](#ssh-configuration)
- [Initial Deployment](#initial-deployment)
- [Environment Configuration](#environment-configuration)
- [Redeployment](#redeployment)
- [Application Management](#application-management)
- [Troubleshooting](#troubleshooting)
- [Production Checklist](#production-checklist)

---

## Overview

The Shop API is a NestJS v9 TypeScript application that serves as a middleware layer between the Shop Frontend and the Main API. It:
- Transforms data between Cellerhut format (Main API) and PickBazar format (Shop Frontend)
- Handles payment gateway integration (Stripe, PayPal)
- Runs on Node.js with TypeScript compilation required
- Uses PM2 for process management in cluster mode
- Serves traffic via Nginx reverse proxy

**Architecture:**
```
Shop Frontend → Shop API (Port 3001) → Main API → Database
```

---

## Prerequisites

### Local Requirements
- SSH client installed
- Git configured with SSH keys
- Access to AWS account

### AWS EC2 Requirements
- Ubuntu 22.04 LTS instance (t2.small or larger recommended)
- Public IP address or Elastic IP
- Security group allowing:
  - SSH (Port 22) from your IP
  - HTTP (Port 80) from anywhere
  - HTTPS (Port 443) from anywhere
- Domain name configured (shop-api.ekasicart.com)
- DNS A record pointing to EC2 instance

### External Dependencies
- **Main API**: Must be accessible at configured URL (https://api.ekasicart.com)
- **Payment Gateways**: Stripe and PayPal accounts with API credentials
- **GitHub**: Repository access with SSH keys

---

## AWS EC2 Setup

### 1. Launch EC2 Instance

```bash
# Recommended configuration:
Instance Type: t2.small (or larger)
OS: Ubuntu 22.04 LTS
Storage: 20 GB GP2
Security Group: ekasi-cart-shop-api-sg
```

### 2. Configure Security Group

Create inbound rules:
```
Type          Protocol    Port    Source
SSH           TCP         22      Your IP/0.0.0.0/0
HTTP          TCP         80      0.0.0.0/0
HTTPS         TCP         443     0.0.0.0/0
Custom TCP    TCP         3001    Your IP (for testing)
```

### 3. Allocate Elastic IP (Recommended)

Associate an Elastic IP to prevent IP changes on instance restart.

---

## SSH Configuration

### 1. Set Up SSH Key on EC2

```bash
# Connect to EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Generate SSH key for GitHub
ssh-keygen -t ed25519 -C "your-email@example.com"

# Display public key
cat ~/.ssh/id_ed25519.pub
```

### 2. Add SSH Key to GitHub

1. Copy the public key output from above
2. Go to GitHub → Settings → SSH and GPG keys → New SSH key
3. Paste the key and save

### 3. Test GitHub Connection

```bash
ssh -T git@github.com
# Should see: "Hi username! You've successfully authenticated..."
```

---

## Initial Deployment

### 1. Upload Deployment Script

From your local machine:
```bash
# Upload deploy.sh to EC2
scp -i your-key.pem /path/to/EkasiCart/shop-api/deploy.sh ubuntu@your-ec2-ip:~/

# Make it executable
ssh -i your-key.pem ubuntu@your-ec2-ip
chmod +x ~/deploy.sh
```

### 2. Configure Deployment Variables

Edit the deploy.sh file and verify these settings:
```bash
sudo nano ~/deploy.sh

# Key variables to check:
GIT_REPO_URL="git@github.com:bringforthjoy101/EkasiCart.git"
GIT_BRANCH="main"
DOMAIN_NAME="shop-api.ekasicart.com"
API_PORT=3001
APP_NAME="ekasi-cart-shop-api"
MAIN_API_URL="https://api.ekasicart.com"
```

### 3. Run Initial Deployment

```bash
sudo ./deploy.sh
```

The script will:
1. Update system packages
2. Install Node.js v20
3. Install PM2 globally
4. Install Nginx
5. Install Certbot for SSL
6. Clone repository to `/var/www/ekasicart-shop-api/`
7. Install dependencies
8. Build TypeScript application (creates `dist/` folder)
9. Create `.env` file from template
10. Configure PM2 with `ecosystem.config.js`
11. Start application in cluster mode
12. Configure Nginx reverse proxy
13. Setup SSL certificate with Let's Encrypt
14. Configure firewall

**Deployment time:** 10-15 minutes

### 4. Verify Deployment

```bash
# Check PM2 status
pm2 status

# Should show:
# ekasi-cart-shop-api | online | max instances

# Check application logs
pm2 logs ekasi-cart-shop-api --lines 50

# Test endpoint
curl http://localhost:3001
curl https://shop-api.ekasicart.com
```

---

## Environment Configuration

### 1. Configure Production Environment

After initial deployment, edit the `.env` file:

```bash
sudo nano /var/www/ekasicart-shop-api/shop-api/.env
```

**Required variables:**
```bash
# Application Configuration
APP_NAME=Marvel
NODE_ENV=production
PORT=3001

# Shop Frontend URL (no trailing slash)
SHOP_URL=https://shop.ekasicart.com

# Main API Configuration
CELLER_HUT_API_URL=https://api.ekasicart.com
CELLER_HUT_API_TIMEOUT=30000

# Currency
DEFAULT_CURRENCY=USD

# Stripe Payment Gateway
STRIPE_API_KEY=sk_live_xxxxxxxxxxxxxxxxxxxx

# PayPal Payment Gateway
PAYPAL_MODE=live
PAYPAL_LIVE_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
PAYPAL_LIVE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxx
PAYPAL_WEBHOOK_ID=xxxxxxxxxxxxxxxxxxxxx
```

**Important:**
- Use **live** credentials for production (not sandbox)
- Set `PAYPAL_MODE=live` for production
- Ensure `CELLER_HUT_API_URL` points to production Main API
- Never commit `.env` file to git

### 2. Restart After Configuration Changes

```bash
cd /var/www/ekasicart-shop-api/shop-api
pm2 restart ekasi-cart-shop-api --update-env
```

---

## Redeployment

For updates and redeployments, use the `redeploy.sh` script.

### 1. Upload Redeploy Script (First Time Only)

```bash
# From local machine
scp -i your-key.pem /path/to/EkasiCart/shop-api/redeploy.sh ubuntu@your-ec2-ip:~/
ssh -i your-key.pem ubuntu@your-ec2-ip
chmod +x ~/redeploy.sh
```

### 2. Run Redeployment

```bash
sudo ./redeploy.sh
```

The script automatically:
1. Shows current application status
2. Stashes local changes (if any)
3. Pulls latest code from git
4. Detects if `package.json` changed → runs `npm install`
5. Detects if source code changed → rebuilds TypeScript
6. Restarts PM2 application
7. Reloads Nginx
8. Shows recent logs

**Redeployment time:** 2-5 minutes

### 3. Manual Redeployment Steps

If you prefer manual control:

```bash
# Navigate to repository root
cd /var/www/ekasicart-shop-api

# Pull latest code
git pull origin main

# Navigate to shop-api directory
cd shop-api

# Install dependencies (if package.json changed)
npm install

# Rebuild application
npm run build

# Restart PM2
pm2 restart ekasi-cart-shop-api --update-env

# Reload Nginx (if needed)
sudo nginx -t && sudo systemctl reload nginx
```

---

## Application Management

### PM2 Commands

```bash
# View status
pm2 status

# View logs (live)
pm2 logs ekasi-cart-shop-api

# View last 100 lines
pm2 logs ekasi-cart-shop-api --lines 100

# View error logs only
pm2 logs ekasi-cart-shop-api --err

# Monitor resources
pm2 monit

# Restart application
pm2 restart ekasi-cart-shop-api

# Stop application
pm2 stop ekasi-cart-shop-api

# Start application
pm2 start ekasi-cart-shop-api

# Delete from PM2
pm2 delete ekasi-cart-shop-api

# Save PM2 configuration
pm2 save

# View detailed info
pm2 describe ekasi-cart-shop-api
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload (graceful restart)
sudo systemctl reload nginx

# Restart
sudo systemctl restart nginx

# Status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log

# View shop-api specific logs
sudo tail -f /var/log/nginx/shop-api.ekasicart.com.access.log
sudo tail -f /var/log/nginx/shop-api.ekasicart.com.error.log
```

### SSL Certificate Management

```bash
# Renew certificates (auto-renewed, but can be done manually)
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# View certificate info
sudo certbot certificates

# Renew specific domain
sudo certbot renew --cert-name shop-api.ekasicart.com
```

### System Commands

```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# View all logs
sudo journalctl -u nginx -f
pm2 logs --lines 1000

# Check open ports
sudo netstat -tulpn | grep LISTEN
```

---

## Troubleshooting

### Application Won't Start

**Problem:** PM2 shows "errored" or "stopped"

**Diagnosis:**
```bash
# Check PM2 logs
pm2 logs ekasi-cart-shop-api --lines 100 --err

# Check if build exists
ls -la /var/www/ekasicart-shop-api/shop-api/dist/main.js

# Test build manually
cd /var/www/ekasicart-shop-api/shop-api
node dist/main.js
```

**Common causes:**
1. **Missing build:** Run `npm run build`
2. **Missing dependencies:** Run `npm install`
3. **Port already in use:** Check `sudo lsof -i :3001`
4. **Environment variables:** Verify `.env` file exists and is configured
5. **Main API unavailable:** Check `CELLER_HUT_API_URL` is accessible

**Fix:**
```bash
cd /var/www/ekasicart-shop-api/shop-api

# Rebuild application
rm -rf dist/
npm run build

# Verify build output
ls -la dist/main.js

# Restart
pm2 restart ekasi-cart-shop-api
```

### Build Failures

**Problem:** `npm run build` fails

**Diagnosis:**
```bash
cd /var/www/ekasicart-shop-api/shop-api
npm run build
```

**Common causes:**
1. **TypeScript errors:** Fix code errors in `src/`
2. **Missing dependencies:** Run `npm install`
3. **Node version:** Ensure Node.js v20 is installed (`node -v`)
4. **Disk space:** Check with `df -h`

**Fix:**
```bash
# Update dependencies
npm install

# Clean and rebuild
rm -rf dist/ node_modules/
npm install
npm run build
```

### Cannot Access Main API

**Problem:** Shop API logs show "ECONNREFUSED" or "Main API unavailable"

**Diagnosis:**
```bash
# Test Main API connectivity from EC2
curl -I https://api.ekasicart.com

# Check environment variable
cat /var/www/ekasicart-shop-api/shop-api/.env | grep CELLER_HUT_API_URL
```

**Fix:**
1. Verify Main API is running
2. Check `CELLER_HUT_API_URL` in `.env`
3. Ensure EC2 security group allows outbound HTTPS
4. Restart Shop API after fixing: `pm2 restart ekasi-cart-shop-api --update-env`

### SSL Certificate Issues

**Problem:** HTTPS not working or certificate expired

**Diagnosis:**
```bash
# Check certificate status
sudo certbot certificates

# Test Nginx config
sudo nginx -t

# Check SSL in browser
curl -I https://shop-api.ekasicart.com
```

**Fix:**
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Reload Nginx
sudo systemctl reload nginx
```

### High Memory Usage

**Problem:** Application consuming too much memory

**Diagnosis:**
```bash
# Check PM2 memory usage
pm2 status

# Check system memory
free -h

# Monitor in real-time
pm2 monit
```

**Fix:**
```bash
# Adjust max memory in ecosystem.config.js
sudo nano /var/www/ekasicart-shop-api/shop-api/ecosystem.config.js

# Change: max_memory_restart: '1G' to '512M' or '2G'

# Restart PM2
pm2 restart ekasi-cart-shop-api
```

### Port 3001 Already in Use

**Problem:** Cannot start application, port conflict

**Diagnosis:**
```bash
# Find process using port 3001
sudo lsof -i :3001
```

**Fix:**
```bash
# Kill the process
sudo kill -9 <PID>

# Or change port in .env and ecosystem.config.js
sudo nano /var/www/ekasicart-shop-api/shop-api/.env
# Change PORT=3001 to PORT=3002

sudo nano /var/www/ekasicart-shop-api/shop-api/ecosystem.config.js
# Change PORT: 3001 to PORT: 3002

# Update Nginx config
sudo nano /etc/nginx/sites-available/shop-api.ekasicart.com
# Change proxy_pass http://localhost:3001 to http://localhost:3002

# Restart services
pm2 restart ekasi-cart-shop-api --update-env
sudo systemctl reload nginx
```

---

## Production Checklist

Before going live, verify:

### Security
- [ ] SSH key-based authentication enabled
- [ ] Password authentication disabled for SSH
- [ ] Firewall (UFW) enabled and configured
- [ ] Only necessary ports open (22, 80, 443)
- [ ] SSL certificate installed and auto-renewal enabled
- [ ] `.env` file contains production credentials (not sandbox)
- [ ] `.env` file is not committed to git
- [ ] Strong passwords for all services

### Configuration
- [ ] `NODE_ENV=production` in `.env`
- [ ] `PAYPAL_MODE=live` (not sandbox)
- [ ] `CELLER_HUT_API_URL` points to production Main API
- [ ] `SHOP_URL` points to production Shop Frontend
- [ ] Live payment gateway credentials configured
- [ ] Domain DNS records configured correctly
- [ ] SSL certificate valid and trusted

### Application
- [ ] Application builds successfully (`npm run build`)
- [ ] `dist/main.js` exists and is recent
- [ ] PM2 shows "online" status
- [ ] All PM2 instances running (check with `pm2 status`)
- [ ] No errors in PM2 logs (`pm2 logs`)
- [ ] Application responds to health check
- [ ] Main API connectivity verified

### Infrastructure
- [ ] Nginx configured and running
- [ ] Nginx proxy passing to port 3001
- [ ] Nginx logs directory exists
- [ ] SSL certificate auto-renewal tested
- [ ] Elastic IP associated (if using)
- [ ] EC2 instance has sufficient resources (CPU, memory, disk)
- [ ] PM2 startup script enabled (`pm2 startup` configured)
- [ ] PM2 configuration saved (`pm2 save`)

### Testing
- [ ] Test HTTPS endpoint: `https://shop-api.ekasicart.com`
- [ ] Test API endpoints (products, categories, etc.)
- [ ] Test payment gateway integration
- [ ] Test Shop Frontend communication
- [ ] Test Main API communication
- [ ] Load test (optional but recommended)

### Monitoring
- [ ] PM2 monitoring setup
- [ ] Log rotation configured
- [ ] Disk space monitoring
- [ ] Uptime monitoring (e.g., UptimeRobot)
- [ ] Error alerting configured

### Documentation
- [ ] Deployment documented
- [ ] Environment variables documented
- [ ] Credentials stored securely (password manager)
- [ ] Team members have access
- [ ] Runbooks created for common issues

---

## Useful Commands Reference

### Quick Status Check
```bash
# One-liner to check everything
pm2 status && sudo systemctl status nginx && df -h && free -h
```

### View All Logs
```bash
# PM2 logs
pm2 logs ekasi-cart-shop-api --lines 200

# Nginx access logs
sudo tail -f /var/log/nginx/shop-api.ekasicart.com.access.log

# Nginx error logs
sudo tail -f /var/log/nginx/shop-api.ekasicart.com.error.log

# System logs
sudo journalctl -u nginx -f
```

### Full Restart
```bash
# Restart everything
pm2 restart ekasi-cart-shop-api --update-env
sudo systemctl restart nginx
```

### Emergency Stop
```bash
# Stop application immediately
pm2 stop ekasi-cart-shop-api

# Stop Nginx
sudo systemctl stop nginx
```

---

## Support and Resources

- **NestJS Documentation:** https://docs.nestjs.com/
- **PM2 Documentation:** https://pm2.keymetrics.io/docs/
- **Nginx Documentation:** https://nginx.org/en/docs/
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **Project Repository:** https://github.com/bringforthjoy101/EkasiCart

---

## License

This deployment guide is part of the Ekasi Cart project.

---

**Last Updated:** 2025-11-19
**Version:** 1.0.0
