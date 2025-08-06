const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email configuration missing. Email sending will not work.');
      return null;
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateEmailList(emails) {
    const errors = [];
    const validEmails = [];

    emails.forEach((email, index) => {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        errors.push(`Email at position ${index + 1} is empty`);
      } else if (!this.validateEmail(trimmedEmail)) {
        errors.push(`Invalid email format: ${trimmedEmail}`);
      } else {
        validEmails.push(trimmedEmail);
      }
    });

    return { validEmails, errors };
  }

  async sendEmail({ recipients, subject, body, senderName = 'Email Sender App' }) {
    if (!this.transporter) {
      throw new Error('Email service is not configured. Please check your environment variables.');
    }

    // Validate recipients
    const { validEmails, errors } = this.validateEmailList(recipients);
    
    if (errors.length > 0) {
      throw new Error(`Email validation failed: ${errors.join(', ')}`);
    }

    if (validEmails.length === 0) {
      throw new Error('No valid recipients found');
    }

    try {
      // Verify transporter connection
      await this.transporter.verify();

      const results = [];
      const failedEmails = [];

      // Send emails individually to handle failures gracefully
      for (const email of validEmails) {
        try {
          const mailOptions = {
            from: `"${senderName}" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: this.formatEmailBody(body),
            text: this.stripHtml(body), // Fallback plain text
          };

          const info = await this.transporter.sendMail(mailOptions);
          results.push({
            email,
            status: 'sent',
            messageId: info.messageId
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError);
          failedEmails.push({
            email,
            error: emailError.message
          });
        }
      }

      return {
        success: true,
        totalRecipients: validEmails.length,
        successful: results.length,
        failed: failedEmails.length,
        results,
        failures: failedEmails
      };

    } catch (error) {
      console.error('Email Service Error:', error);
      
      if (error.code === 'EAUTH') {
        throw new Error('Email authentication failed. Please check your email credentials.');
      }
      
      if (error.code === 'ECONNECTION') {
        throw new Error('Failed to connect to email server. Please check your network connection.');
      }
      
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  formatEmailBody(body) {
    let emailBody = body;
    
    console.log('📧 Formatting email body, type:', typeof body);
    console.log('📧 Body preview:', body?.substring(0, 200));
    
    // Emergency fix: if body still contains JSON structure, extract it
    if (typeof body === 'string' && body.includes('"subject"') && body.includes('"body"')) {
      console.log('🚨 EMERGENCY: Body contains full JSON structure, attempting to extract...');
      try {
        const match = body.match(/"body"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        if (match && match[1]) {
          emailBody = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
          console.log('✅ Extracted body from JSON:', emailBody.substring(0, 100));
        }
      } catch (e) {
        console.error('❌ Failed to extract body from JSON structure');
      }
    }
    
    // Handle case where body might be a JSON string or object
    if (typeof body === 'object' && body !== null) {
      // If body is an object, try to extract the actual email content
      if (body.body) {
        emailBody = body.body;
        console.log('Extracted body from object:', emailBody?.substring(0, 100));
      } else if (body.subject && body.body === undefined) {
        // If it's the full email object, something went wrong
        console.error('⚠️  Full email object passed as body!', body);
        emailBody = 'Error: Invalid email body format';
      }
    } else if (typeof body === 'string') {
      // If body is a string that looks like JSON, try to parse it
      if (body.trim().startsWith('{') && body.trim().endsWith('}')) {
        try {
          const parsed = JSON.parse(body);
          if (parsed.body) {
            emailBody = parsed.body;
            console.log('Extracted body from JSON string:', emailBody?.substring(0, 100));
          } else if (parsed.subject && parsed.body === undefined) {
            console.error('⚠️  Parsed object missing body field!', parsed);
            emailBody = 'Error: Parsed email missing body content';
          }
        } catch (e) {
          console.warn('Failed to parse body as JSON, using as plain text');
          // Remove any JSON-like artifacts from plain text
          emailBody = body.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
        }
      }
    }
    
    // Ensure we have a string
    if (typeof emailBody !== 'string') {
      console.error('⚠️  Email body is not a string after processing!', typeof emailBody);
      emailBody = String(emailBody);
    }
    
    // Convert plain text to HTML with basic formatting
    return emailBody
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/<p><\/p>/g, '');
  }

  stripHtml(html) {
    // Remove HTML tags for plain text fallback
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  }

  async testConnection() {
    if (!this.transporter) {
      throw new Error('Email service is not configured');
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service connection successful' };
    } catch (error) {
      throw new Error(`Email service connection failed: ${error.message}`);
    }
  }
}

module.exports = new EmailService();