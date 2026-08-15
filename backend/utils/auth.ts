import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "medi-voice-secret-pilot-2026";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export interface AuthenticatedUser {
  username: string;
  role: "clinicAdmin" | "superAdmin";
  clinicId: string;
}

export function generateAccessToken(user: AuthenticatedUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function generateRefreshToken(user: AuthenticatedUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
  } catch (err) {
    return null;
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token missing" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: "Invalid or expired access token" });
  }

  (req as any).user = decoded;
  next();
}

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthenticatedUser | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Permission denied for this role" });
    }

    next();
  };
}
