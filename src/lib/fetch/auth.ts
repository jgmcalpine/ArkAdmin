import { db } from './db';

export async function authenticateApiKey(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return false;
  }

  // Case-insensitive Bearer token parsing
  const bearerMatch = authHeader.match(/^bearer\s+(.+)$/i);
  
  if (!bearerMatch || !bearerMatch[1]) {
    return false;
  }

  const token = bearerMatch[1].trim();

  if (!token) {
    return false;
  }

  // Query database for active API key
  const apiKey = await db.apiKey.findFirst({
    where: {
      key: token,
      isActive: true,
    },
  });

  return !!apiKey;
}

