/** PM2: pm2 start deploy/ecosystem.config.cjs
 *  Port nội bộ mặc định 3002 — tránh đụng web khác thường dùng 3000/3001
 */
const appPort = process.env.HOAPHONG_PORT || "3002";

module.exports = {
  apps: [
    {
      name: "hoaphong-site",
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      args: `start -p ${appPort}`,
      instances: 1,
      autorestart: true,
      max_memory_restart: "800M",
      env: {
        NODE_ENV: "production",
        PORT: appPort,
      },
    },
  ],
};
