// middleware/twilioAuth.js
import twilio from 'twilio';

export const verifyTwilioRequest = (req, res, next) => {
  const twilioSignature = req.headers['x-twilio-signature'];
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!twilioSignature) {
    return res.status(403).send('Forbidden: Missing Twilio signature');
  }

  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.body || {};

  const isValid = twilio.validateRequest(authToken, twilioSignature, url, params);

  if (!isValid) {
    return res.status(403).send('Forbidden: Invalid Twilio signature');
  }

  next();
};
