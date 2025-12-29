import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import { db } from '../../db/client.js';

interface ChaserConfig {
  leadId: string;
  accountId: string;
  userId: string;
  message: string;
  channel: 'sms' | 'email';
  recipient: {
    phone?: string;
    email?: string;
    name: string;
  };
  metadata?: {
    documentType?: string;
    missingField?: string;
    extractionId?: string;
    sentViaApi?: boolean;
    apiVersion?: string;
  };
}

interface ChaserResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export class MessagingService {
  private static twilioClient: twilio.Twilio | null = null;
  private static sendgridConfigured = false;

  /**
   * Initialize Twilio client (lazy loading)
   */
  private static getTwilioClient(): twilio.Twilio {
    if (!this.twilioClient) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not configured in environment variables');
      }

      this.twilioClient = twilio(accountSid, authToken);
    }
    return this.twilioClient;
  }

  /**
   * Initialize SendGrid (lazy loading)
   */
  private static initSendGrid(): void {
    if (!this.sendgridConfigured) {
      const apiKey = process.env.SENDGRID_API_KEY;

      if (!apiKey) {
        throw new Error('SendGrid API key not configured in environment variables');
      }

      sgMail.setApiKey(apiKey);
      this.sendgridConfigured = true;
    }
  }

  /**
   * MAIN METHOD: Send automated chaser via SMS or Email
   * Logs all attempts to audit_logs table
   */
  public static async sendChaser(config: ChaserConfig): Promise<ChaserResult> {
    const startTime = Date.now();

    try {
      let result: ChaserResult;

      // Route to appropriate channel
      if (config.channel === 'sms') {
        result = await this.sendSMS(config);
      } else {
        result = await this.sendEmail(config);
      }

      // Log successful attempt to audit_logs
      await this.logChaserAttempt({
        accountId: config.accountId,
        userId: config.userId,
        leadId: config.leadId,
        action: `chaser.sent.${config.channel}`,
        resourceType: 'lead',
        metadata: {
          ...config.metadata,
          recipient: config.recipient,
          messageId: result.messageId,
          deliveryTime: Date.now() - startTime
        },
        success: result.success
      });

      return result;
    } catch (error) {
      console.error('Chaser send error:', error);

      // Log failed attempt
      await this.logChaserAttempt({
        accountId: config.accountId,
        userId: config.userId,
        leadId: config.leadId,
        action: `chaser.failed.${config.channel}`,
        resourceType: 'lead',
        metadata: {
          ...config.metadata,
          error: (error as Error).message
        },
        success: false
      });

      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Send SMS via Twilio
   */
  private static async sendSMS(config: ChaserConfig): Promise<ChaserResult> {
    if (!config.recipient.phone) {
      throw new Error('Phone number required for SMS channel');
    }

    const client = this.getTwilioClient();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!fromNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    try {
      const message = await client.messages.create({
        body: config.message,
        from: fromNumber,
        to: config.recipient.phone
      });

      return {
        success: true,
        messageId: message.sid,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Twilio SMS failed: ${(error as Error).message}`);
    }
  }

  /**
   * Send Email via SendGrid
   */
  private static async sendEmail(config: ChaserConfig): Promise<ChaserResult> {
    if (!config.recipient.email) {
      throw new Error('Email address required for email channel');
    }

    this.initSendGrid();

    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@soloscale.ai';
    const fromName = process.env.SENDGRID_FROM_NAME || 'SoloScale Mortgage';

    try {
      const msg = {
        to: config.recipient.email,
        from: {
          email: fromEmail,
          name: fromName
        },
        subject: 'Document Required for Your Mortgage Application',
        text: config.message,
        html: this.generateEmailHTML(config.recipient.name, config.message, config.metadata)
      };

      const [response] = await sgMail.send(msg);

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`SendGrid email failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate professional HTML email template
   */
  private static generateEmailHTML(
    recipientName: string,
    message: string,
    metadata?: ChaserConfig['metadata']
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
    .content { background: white; padding: 30px 20px; border: 1px solid #e2e8f0; border-top: none; }
    .message-box { background: #f8fafc; padding: 20px; border-left: 4px solid #2563eb; border-radius: 8px; margin: 20px 0; }
    .document-info { background: #fffbeb; border: 1px solid #fde68a; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .document-info h3 { margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: 700; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-radius: 0 0 12px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; }
    .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SOLOSCALE</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Mortgage Intelligence Platform</p>
    </div>

    <div class="content">
      <h2 style="color: #1e293b; margin-top: 0;">Hi ${recipientName},</h2>

      <div class="message-box">
        <p style="margin: 0; font-size: 16px; color: #334155;">${message}</p>
      </div>

      ${metadata?.documentType ? `
      <div class="document-info">
        <h3>📄 Document Details</h3>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Type:</strong> ${metadata.documentType}</p>
        ${metadata.missingField ? `<p style="margin: 5px 0; font-size: 14px;"><strong>Missing:</strong> ${metadata.missingField}</p>` : ''}
      </div>
      ` : ''}

      <p style="color: #475569;">Please upload the requested document at your earliest convenience to avoid delays in your application.</p>

      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'https://app.soloscale.ai'}" class="cta-button">Upload Document</a>
      </div>

      <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
        If you have any questions, please reply to this email or contact your mortgage broker directly.
      </p>
    </div>

    <div class="footer">
      <p style="margin: 5px 0;">© ${new Date().getFullYear()} SoloScale. All rights reserved.</p>
      <p style="margin: 5px 0;">Automated by AI-powered mortgage intelligence</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Log chaser attempt to audit_logs table
   */
  private static async logChaserAttempt(data: {
    accountId: string;
    userId: string;
    leadId: string;
    action: string;
    resourceType: string;
    metadata: any;
    success: boolean;
  }): Promise<void> {
    try {
      await db.query(
        `INSERT INTO audit_logs (
          account_id, user_id, action, resource_type, resource_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          data.accountId,
          data.userId,
          data.action,
          data.resourceType,
          data.leadId,
          JSON.stringify({
            ...data.metadata,
            success: data.success
          })
        ]
      );
    } catch (error) {
      console.error('Failed to log chaser attempt:', error);
      // Don't throw - audit logging failure shouldn't break chaser functionality
    }
  }

  /**
   * Batch send chasers (for workflow automation)
   */
  public static async sendBatchChasers(
    chasers: ChaserConfig[]
  ): Promise<{ sent: number; failed: number; results: ChaserResult[] }> {
    const results: ChaserResult[] = [];
    let sent = 0;
    let failed = 0;

    for (const chaser of chasers) {
      const result = await this.sendChaser(chaser);
      results.push(result);

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      // Rate limiting: wait 100ms between sends
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return { sent, failed, results };
  }

  /**
   * Get chaser history for a lead
   */
  public static async getChaserHistory(
    accountId: string,
    leadId: string
  ): Promise<Array<{
    action: string;
    channel: 'sms' | 'email';
    success: boolean;
    timestamp: Date;
    metadata: any;
  }>> {
    try {
      const result = await db.query(
        `SELECT action, metadata, created_at
         FROM audit_logs
         WHERE account_id = $1
           AND resource_type = 'lead'
           AND resource_id = $2
           AND action LIKE 'chaser.%'
         ORDER BY created_at DESC
         LIMIT 50`,
        [accountId, leadId]
      );

      return result.rows.map(row => ({
        action: row.action,
        channel: row.action.includes('.sms') ? 'sms' : 'email',
        success: row.metadata.success || false,
        timestamp: row.created_at,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('Failed to fetch chaser history:', error);
      return [];
    }
  }
}
