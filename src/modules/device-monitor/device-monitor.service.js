import {
  listDevicePresence as listDevicePresenceFromDatabase,
  recordDevicePresence as recordDevicePresenceInDatabase,
} from "./device-monitor.repository.js";

const invalid = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getString = (value, field, maxLength) => {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw invalid(`${field} tidak valid.`);
  }
  return value.trim() || null;
};

export const recordDevicePresence = async ({ user, body, userAgent }) => {
  const userId = Number(user?.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw invalid("Sesi pengguna tidak valid.", 401);
  }

  const deviceId = getString(body?.device_id, "ID perangkat", 36);
  const isValidDeviceId =
    deviceId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      deviceId,
    );
  if (!isValidDeviceId) {
    throw invalid("ID perangkat tidak valid.");
  }

  const activePage = getString(body?.active_page, "Halaman aktif", 255);
  if (!activePage?.startsWith("/") || activePage.startsWith("//")) {
    throw invalid("Halaman aktif tidak valid.");
  }

  const values = {
    deviceId,
    userId,
    activePage,
    browser: getString(body?.browser, "Browser", 80),
    platform: getString(body?.platform, "Platform", 100),
    deviceType: getString(body?.device_type, "Jenis perangkat", 32),
    screenSize: getString(body?.screen_size, "Ukuran layar", 24),
    language: getString(body?.language, "Bahasa", 35),
    userAgent: getString(userAgent, "User agent", 500),
  };

  await recordDevicePresenceInDatabase(values);
};

export const listDevicePresence = async ({ user }) => {
  if (user?.peran !== "super") {
    throw invalid("Hanya super yang dapat melihat monitor perangkat.", 403);
  }

  return listDevicePresenceFromDatabase();
};
