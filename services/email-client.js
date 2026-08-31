import { Resend } from 'resend';

/**
 * Default sender email address
 */
const DEFAULT_FROM_EMAIL = 'Puplets <hello@puplets.co.uk>';

/**
 * Email client for sending customer notifications via Resend
 */
export class EmailClient {
  constructor(apiKey, fromEmail = DEFAULT_FROM_EMAIL) {
    if (!apiKey) {
      throw new Error('Resend API key is required');
    }
    this.resend = this.initializeResendClient(apiKey);
    this.fromEmail = fromEmail;
  }

  /**
   * Initialize Resend client
   * @param {string} apiKey - Resend API key
   * @returns {Resend} Configured Resend client instance
   * @private
   */
  initializeResendClient(apiKey) {
    return new Resend(apiKey);
  }

  /**
   * Send email via Resend API
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject line
   * @param {string} html - HTML email body
   * @param {string} text - Plain text email body
   * @returns {Promise<Object>} Response with message ID
   * @private
   */
  async sendEmail(to, subject, html, text) {
    const { data, error } = await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject,
      html,
      text
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return {
      id: data.id
    };
  }

  /**
   * Send customer confirmation email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject line
   * @param {string} html - HTML email body
   * @param {string} text - Plain text email body
   * @returns {Promise<Object>} Response with message ID
   */
  async sendCustomerConfirmation(to, subject, html, text) {
    return this.sendEmail(to, subject, html, text);
  }

  /**
   * Send shop owner notification email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject line
   * @param {string} html - HTML email body
   * @param {string} text - Plain text email body
   * @returns {Promise<Object>} Response with message ID
   */
  async sendShopOwnerNotification(to, subject, html, text) {
    return this.sendEmail(to, subject, html, text);
  }

  /**
   * Send shipping notification email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject line
   * @param {string} html - HTML email body
   * @param {string} text - Plain text email body
   * @returns {Promise<Object>} Response with message ID
   */
  async sendShippingNotification(to, subject, html, text) {
    return this.sendEmail(to, subject, html, text);
  }
}

/**
 * Create email client instance from environment
 * @returns {EmailClient} Configured email client
 */
export function createEmailClient() {
  const apiKey = process.env.RESEND_API_KEY;
  return new EmailClient(apiKey);
}
