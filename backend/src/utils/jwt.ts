import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  orgId: string;
}

export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign(payload, secret, { expiresIn: "30d" });
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET as string;
  return jwt.verify(token, secret) as JwtPayload;
}
