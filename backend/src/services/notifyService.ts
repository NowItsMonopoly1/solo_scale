import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { config } from '../config/index.js';
import { query } from '../db/client.js';

/**
 * Unified notification service for SMS and Email
 * Supports Twilio (SMS) and SendGrid (Email)
 */

interface SMSOptions {
  to: string;
  message: string;
  from?: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  from?: string;
  html?: string;
}

interface ChaserOptions {
  leadId: string;
  accountId: string;
  chaserType: 'sms' | 'email' | 'both';
  reason: string;
  templateId?: string;
  customTemplate?: string;
  scheduledAt?: Date;
  createdByUserId?: string;
}

export class NotifyService {
  private static twilioClient: twilio.Twilio | null = null;
  private static sendGridInitialized = false;

  /**
   * Initialize Twilio client (lazy initialization)
   */
  private static getTwilioClient(): twilio.Twilio {
    if (!this.twilioClient) {
      if (!config.twilio.accountSid || !config.twilio.authToken) {
        throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
      }
      this.twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
    }
    return this.twilioClient;
  }

  /**
   * Initialize SendGrid (lazy initialization)
   */
  private static initSendGrid(): void {
    if (!this.sendGridInitialized) {
      if (!config.sendgrid.apiKey) {
        throw new Error('SendGrid API key not configured. Set SENDGRID_API_KEY.');
      }
      sgMail.setApiKey(config.sendgrid.apiKey);
      this.sendGridInitialized = true;
    }
  }

  /**
   * Send SMS via Twilio
   */
  static async sendSMS(options: SMSOptions): Promise<{ sid: string; status: string }> {
    const client = this.getTwilioClient();
    const from = options.from || config.twilio.phoneNumber;

    if (!from) {
      throw new Error('Twilio phone number not configured. Set TWILIO_PHONE_NUMBER.');
    }

    try {
      const message = await client.messages.create({
        body: options.message,
        from,
        to: options.to
      });

      return {
        sid: message.sid,
        status: message.status
      };
    } catch (error: any) {
      throw new Error(`Twilio SMS failed: ${error.message}`);
    }
  }

  /**
   * Send Email via SendGrid
   */
  static async sendEmail(options: EmailOptions): Promise<{ messageId: string }> {
    this.initSendGrid();
    const from = options.from || config.sendgrid.fromEmail;

    if (!from) {
      throw new Error('SendGrid from email not configured. Set SENDGRID_FROM_EMAIL.');
    }

    try {
      const msg = {
        to: options.to,
        from,
        subject: options.subject,
        text: options.body,
        html: options.html || options.body.replace(/\n/g, '<br>')
      };

      const [response] = await sgMail.send(msg);

      return {
        messageId: response.headers['x-message-id'] || 'unknown'
      };
    } catch (error: any) {
      throw new Error(`SendGrid email failed: ${error.message}`);
    }
  }

  /**
   * Create automated chaser in database
   * This schedules a follow-up SMS/Email for missing documents
   */
  static async createChaser(options: ChaserOptions): Promise<string> {
    const chaserId = `chaser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get template content if templateId provided
    let templateUsed = options.customTemplate || '';
    if (options.templateId) {
      const templateResult = await query(
        'SELECT body FROM message_templates WHERE id = $1 AND account_id = $2',
        [options.templateId, options.accountId]
      );
      if (templateResult.rows.length > 0) {
        templateUsed = templateResult.rows[0].body;
      }
    }

    await query(
      `INSERT INTO chasers (
        id, account_id, lead_id, chaser_type, reason, template_used,
        status, scheduled_at, created_by_user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        chaserId,
        options.accountId,
        options.leadId,
        options.chaserType,
        options.reason,
        templateUsed,
        'pending',
        options.scheduledAt || new Date(),
        options.createdByUserId || null
      ]
    );

    return chaserId;
  }

  /**
   * Send pending chasers (called by scheduler)
   */
  static async sendPendingChasers(): Promise<{ sent: number; failed: number }> {
    const result = await query(
      `SELECT c.*, l.name as lead_name, l.email as lead_email, l.phone as lead_phone
       FROM chasers c
       JOIN leads l ON c.lead_id = l.id
       WHERE c.status = 'pending'
         AND c.scheduled_at <= NOW()
       ORDER BY c.scheduled_at ASC
       LIMIT 100`
    );

    let sent = 0;
    let failed = 0;

    for (const chaser of result.rows) {
      try {
        // Send SMS
        if ((chaser.chaser_type === 'sms' || chaser.chaser_type === 'both') && chaser.lead_phone) {
          await this.sendSMS({
            to: chaser.lead_phone,
            message: chaser.template_used
          });
        }

        // Send Email
        if ((chaser.chaser_type === 'email' || chaser.chaser_type === 'both') && chaser.lead_email) {
          await this.sendEmail({
            to: chaser.lead_email,
            subject: `Follow-up: ${chaser.reason}`,
            body: chaser.template_used
          });
        }

        // Mark as sent
        await query(
          `UPDATE chasers
           SET status = 'sent', sent_at = NOW(), delivery_status = 'delivered', updated_at = NOW()
           WHERE id = $1`,
          [chaser.id]
        );

        // Log compliance event
        await query(
          `INSERT INTO compliance_logs (
            id, account_id, lead_id, event_type, event_data,
            regulatory_category, performed_by_ai, occurred_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            chaser.account_id,
            chaser.lead_id,
            'chaser_sent',
            JSON.stringify({
              chaser_id: chaser.id,
              chaser_type: chaser.chaser_type,
              reason: chaser.reason
            }),
            'RESPA',
            true
          ]
        );

        sent++;
      } catch (error: any) {
        // Mark as failed
        await query(
          `UPDATE chasers
           SET status = 'failed', delivery_error = $1, updated_at = NOW()
           WHERE id = $2`,
          [error.message, chaser.id]
        );
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Substitute variables in message template
   * Example: "Hi {{client_name}}" -> "Hi John Doe"
   */
  static substituteVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  /**
   * Get message template by ID
   */
  static async getTemplate(templateId: string, accountId: string): Promise<string | null> {
    const result = await query(
      'SELECT body FROM message_templates WHERE id = $1 AND account_id = $2',
      [templateId, accountId]
    );
    return result.rows.length > 0 ? result.rows[0].body : null;
  }
}
