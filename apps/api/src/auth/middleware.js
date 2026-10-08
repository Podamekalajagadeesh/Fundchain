import { verifyAccessToken } from "./service.js";

export function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const token = authorization.slice(7);
    const payload = verifyAccessToken(token);

    req.user = payload;

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      success: false,
      error: "Invalid or expired authentication token",
    });
  }
}
