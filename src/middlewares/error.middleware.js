export default (err, req, res, next) => {
  const status = err.message === "User not found" ? 404 : 500;

  console.error("Error : ", err.message);

  res.status(status).json({
    success: false,
    message: err.message,
  });
};
