module.exports = {
  apps: [
    {
      name: "express-erp",
      script: "app.js",
      restart_delay: 5000,
      max_restarts: 3,
      // ... other PM2 options ...
    },
  ],
};