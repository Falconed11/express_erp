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

  res.status(status).json({
    success: false,
    message,
  });
};
