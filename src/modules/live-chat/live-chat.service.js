import * as Repository from "./live-chat.repository.js";
import { isSendRateLimited } from "./live-chat.rules.js";

const createHttpError = (statusCode, message) =>
  Object.assign(new Error(message), { statusCode });

const getPositiveId = (value, label) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createHttpError(400, `${label} tidak valid.`);
  }
  return id;
};

const getUserContext = (user) => ({
  userId: getPositiveId(user?.id, "Sesi pengguna"),
  employeeId:
    user?.id_karyawan == null
      ? null
      : getPositiveId(user.id_karyawan, "Karyawan"),
  role: user?.peran,
});

export const listOnlineEmployees = async () =>
  Repository.listOnlineEmployees();

export const listMessages = async ({ afterId }) => {
  let normalizedAfterId = null;
  if (afterId != null) {
    normalizedAfterId = Number(afterId);
    if (!Number.isSafeInteger(normalizedAfterId) || normalizedAfterId < 0) {
      throw createHttpError(400, "ID pesan tidak valid.");
    }
  }

  return Repository.listMessages({ afterId: normalizedAfterId });
};

export const createMessage = async ({ user, message }) => {
  const context = getUserContext(user);
  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.trim().length > 1000
  ) {
    throw createHttpError(400, "Pesan wajib diisi dan maksimal 1000 karakter.");
  }

  try {
    return await Repository.createMessage({
      ...context,
      message: message.trim(),
      isRateLimited: isSendRateLimited,
    });
  } catch (error) {
    if (error.code === "CHAT_RATE_LIMITED") {
      throw createHttpError(
        429,
        "Tunggu 2 detik sebelum mengirim pesan berikutnya.",
      );
    }
    throw error;
  }
};
