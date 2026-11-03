import pool from "../../config/db.js";

export const recordDevicePresence = async ({
  deviceId,
  userId,
  activePage,
  browser,
  platform,
  deviceType,
  screenSize,
  language,
  userAgent,
}) => {
  await pool.execute(
    `INSERT INTO device_monitor
       (device_id, user_id, active_page, browser, platform, device_type,
        screen_size, language, user_agent, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       active_page = VALUES(active_page),
       browser = VALUES(browser),
       platform = VALUES(platform),
       device_type = VALUES(device_type),
       screen_size = VALUES(screen_size),
       language = VALUES(language),
       user_agent = VALUES(user_agent),
       last_seen = CURRENT_TIMESTAMP,
       updated_at = CURRENT_TIMESTAMP`,
    [
      deviceId,
      userId,
      activePage,
      browser,
      platform,
      deviceType,
      screenSize,
      language,
      userAgent,
    ],
  );
};

export const listDevicePresence = async () => {
  const [rows] = await pool.execute(
    `SELECT d.device_id, u.username, u.peran AS role, k.nama AS employee_name,
            d.active_page, d.browser, d.platform, d.device_type,
            d.screen_size, d.language, d.user_agent, d.last_seen,
            d.last_seen >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 90 SECOND) AS is_active
     FROM device_monitor d
     LEFT JOIN \`user\` u ON u.id = d.user_id
     LEFT JOIN karyawan k ON k.id = u.id_karyawan
     ORDER BY d.last_seen DESC`,
  );

  return rows.map((row) => ({
    ...row,
    is_active: Number(row.is_active) === 1,
  }));
};
