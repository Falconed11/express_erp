import db from "../../config/db.js";

export const listOnlineEmployees = async () => {
  const [rows] = await db.execute(
    `SELECT k.id, k.nama
     FROM device_monitor d
     JOIN \`user\` u ON u.id = d.user_id
     JOIN karyawan k ON k.id = u.id_karyawan
     WHERE d.last_seen >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 90 SECOND)
       AND k.nama IS NOT NULL
       AND TRIM(k.nama) <> ''
     GROUP BY k.id, k.nama
     ORDER BY k.nama ASC`,
  );
  return rows;
};

export const listMessages = async ({ afterId }) => {
  const [rows] =
    afterId == null
      ? await db.execute(
          `SELECT messages.id, messages.id_user AS sender_id,
                  sender.id_karyawan AS sender_employee_id,
                  COALESCE(NULLIF(employee.nama, ''), sender.username) AS sender_name,
                  messages.message, messages.created_at
           FROM live_chat_message messages
           JOIN \`user\` sender ON sender.id = messages.id_user
           LEFT JOIN karyawan employee ON employee.id = sender.id_karyawan
           WHERE messages.aktif = 1
           ORDER BY messages.id DESC
           LIMIT 30`,
          [],
        )
      : await db.execute(
          `SELECT messages.id, messages.id_user AS sender_id,
                  sender.id_karyawan AS sender_employee_id,
                  COALESCE(NULLIF(employee.nama, ''), sender.username) AS sender_name,
                  messages.message, messages.created_at
           FROM live_chat_message messages
           JOIN \`user\` sender ON sender.id = messages.id_user
           LEFT JOIN karyawan employee ON employee.id = sender.id_karyawan
           WHERE messages.id > ?
             AND messages.aktif = 1
           ORDER BY messages.id ASC
           LIMIT 30`,
          [afterId],
        );

  return afterId == null ? rows.reverse() : rows;
};

export const createMessage = async ({
  userId,
  employeeId,
  role,
  message,
  isRateLimited,
}) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [users] = await connection.execute(
      "SELECT id FROM `user` WHERE id = ? FOR UPDATE",
      [userId],
    );
    if (users.length === 0) {
      const error = new Error("Sesi pengguna tidak valid.");
      error.statusCode = 401;
      throw error;
    }

    if (role !== "super") {
      const [recentMessages] = await connection.execute(
        `SELECT TIMESTAMPDIFF(
           MICROSECOND, created_at, CURRENT_TIMESTAMP(3)
         ) AS elapsed_microseconds
         FROM live_chat_message
         WHERE id_user = ?
         ORDER BY id DESC
         LIMIT 1`,
        [userId],
      );
      if (
        recentMessages.length > 0 &&
        isRateLimited(role, recentMessages[0].elapsed_microseconds)
      ) {
        const error = new Error("Chat send rate limit reached.");
        error.code = "CHAT_RATE_LIMITED";
        throw error;
      }
    }

    const [result] = await connection.execute(
      `INSERT INTO live_chat_message
         (id_user, message, created_by, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
      [userId, message, employeeId],
    );
    const [rows] = await connection.execute(
      `SELECT messages.id, messages.id_user AS sender_id,
              sender.id_karyawan AS sender_employee_id,
              COALESCE(NULLIF(employee.nama, ''), sender.username) AS sender_name,
              messages.message, messages.created_at
       FROM live_chat_message messages
       JOIN \`user\` sender ON sender.id = messages.id_user
       LEFT JOIN karyawan employee ON employee.id = sender.id_karyawan
       WHERE messages.id = ?`,
      [result.insertId],
    );

    await connection.commit();
    return rows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
