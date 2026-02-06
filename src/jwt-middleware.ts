import { jwtVerify } from 'jose';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to verify JWT token from Authorization header
 */
export async function verifyJWT(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip verification if JWT_SECRET is not configured (for development)
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) {
    console.warn('JWT_SECRET not configured - skipping token verification');
    next();
    return;
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected: Bearer <token>'
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify token signature and expiry
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'aidyne-solutions-website',
      audience: 'seo-agent-cloud-run',
    });

    // Token is valid - attach payload to request for potential future use
    (req as any).jwtPayload = payload;
    
    next();
  } catch (error: any) {
    console.error('JWT verification failed:', error.message);
    
    // Provide specific error messages
    if (error.code === 'ERR_JWT_EXPIRED') {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Token has expired. Please try again.'
      });
    } else if (error.code === 'ERR_JWT_INVALID') {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid token signature.'
      });
    } else if (error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Token validation failed. Invalid issuer or audience.'
      });
    } else {
      res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Token verification failed.'
      });
    }
  }
}

