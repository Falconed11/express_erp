import { writeApiLog } from "../utils/api-logger.js";

export default (err, req, res, next) => {
  const duplicateName = err.message?.match(
    /Duplicate entry '([^']+)' for key 'unique_nama'/i,
  );
  const status = duplicateName
    ? 400
    : err.statusCode || (err.message === "User not found" ? 404 : 500);
  const message = duplicateName
    ? `Nama "${duplicateName[1]}" sudah digunakan. Silakan gunakan nama yang berbeda.`
    : err.message;

  console.error("Error : ", err.message);
  writeApiLog("handler_error", {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode: status,
    errorName: err.name,
    errorCode: err.code,
    errorNumber: err.errno,
    sqlState: err.sqlState,
  });

  res.status(status).json({
    success: false,
    message,
  });
};
