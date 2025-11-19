module.exports = {
  apps: [{
    name: 'ekasi-cart-shop-api',
    script: './dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
    error_file: '/var/log/pm2/ekasi-cart-shop-api-error.log',
    out_file: '/var/log/pm2/ekasi-cart-shop-api-out.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    shutdown_with_message: true
  }]
};
