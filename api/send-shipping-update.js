/**
 * Send shipping update notification API endpoint
 * Called by Airtable automation when shop owner marks order as shipped
 */

export default async (req, res) => {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract Authorization header
  const authHeader = req.headers.authorization;

  // Check if Authorization header is missing or empty
  if (!authHeader || authHeader.trim() === '') {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  // Check if Authorization header follows "Bearer <token>" format
  const bearerPrefix = 'Bearer ';
  if (!authHeader.startsWith(bearerPrefix)) {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  // Extract token from "Bearer <token>" (do not trim - strict format check)
  const token = authHeader.slice(bearerPrefix.length);

  // Check if token is empty after "Bearer "
  if (!token || token.trim() === '') {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  // Verify token matches environment variable
  if (token !== process.env.SHIPPING_UPDATE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Validate request body exists and is an object
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Missing request body' });
  }

  // Validate orderId is present and is a non-empty string
  if (!req.body.orderId || typeof req.body.orderId !== 'string' || req.body.orderId.trim() === '') {
    return res.status(400).json({ error: 'Missing required field: orderId' });
  }

  // If trackingUrl is provided, validate it's a string starting with http:// or https://
  if (req.body.trackingUrl !== undefined) {
    if (typeof req.body.trackingUrl !== 'string' ||
        (!req.body.trackingUrl.startsWith('http://') && !req.body.trackingUrl.startsWith('https://'))) {
      return res.status(400).json({ error: 'Invalid trackingUrl format' });
    }
  }

  // TODO: Implement shipping notification logic in subsequent steps
  return res.status(200).json({ message: 'Authenticated' });
};
