import jwt from "jsonwebtoken";

const parseCookieToken = (cookieHeader) => {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    acc[name] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});

  return (
    cookies.token || cookies.jwt || cookies.authToken || cookies.authorization
  );
};

const verifyToken = (req, res, next) => {
  try {
    const authHeaderToken = req.headers.authorization?.split(" ")[1];
    const cookieToken = req.cookies["expressToken"];
    const token = authHeaderToken || cookieToken;

    if (!token) {
      console.log("Token not found in request");
      return res
        .status(401)
        .json({ success: false, message: "Token tidak ditemukan" });
    }
    // console.log("Token found, verifying...");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("Token verified successfully");
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      console.log("Token has expired");
      return res
        .status(401)
        .json({ success: false, message: "Token telah kadaluarsa" });
    }

    console.log("Invalid token");
    res.status(401).json({ success: false, message: "Token tidak valid" });
  }
};

export default verifyToken;
