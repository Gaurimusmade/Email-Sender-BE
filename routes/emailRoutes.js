const express = require('express');
const Joi = require('joi');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');

const router = express.Router();

// Validation schemas
const generateEmailSchema = Joi.object({
  prompt: Joi.string().required().min(10).max(1000),
  recipients: Joi.array().items(Joi.string().email()).optional(),
  tone: Joi.string().valid('professional', 'casual', 'formal', 'friendly').default('professional'),
  emailType: Joi.string().valid('general', 'business', 'marketing', 'follow-up', 'invitation').default('general')
});

const sendEmailSchema = Joi.object({
  recipients: Joi.array().items(Joi.string().email()).required().min(1),
  subject: Joi.string().required().min(1).max(200),
  body: Joi.string().required().min(10),
  senderName: Joi.string().optional().max(100)
});

const improveEmailSchema = Joi.object({
  originalEmail: Joi.object({
    subject: Joi.string().required(),
    body: Joi.string().required()
  }).required(),
  improvementRequest: Joi.string().required().min(5).max(500)
});

// Generate email using AI
router.post('/generate', async (req, res, next) => {
  try {
    const { error, value } = generateEmailSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { prompt, recipients, tone, emailType } = value;

    const generatedEmail = await aiService.generateEmail(prompt, {
      recipients,
      tone,
      emailType
    });

    // Debug: Log what AI service returned
    console.log('🤖 AI Service returned:', {
      subjectType: typeof generatedEmail.subject,
      bodyType: typeof generatedEmail.body,
      subjectPreview: generatedEmail.subject?.substring(0, 50),
      bodyPreview: generatedEmail.body?.substring(0, 100),
      bodyContainsJSON: generatedEmail.body?.includes('"subject"')
    });

    // Ensure we're sending clean data
    const cleanSubject = typeof generatedEmail.subject === 'string' ? generatedEmail.subject : 'Generated Email';
    const cleanBody = typeof generatedEmail.body === 'string' ? generatedEmail.body : 'Error generating email content';

    res.status(200).json({
      success: true,
      message: 'Email generated successfully',
      data: {
        subject: cleanSubject,
        body: cleanBody,
        metadata: {
          prompt,
          tone,
          emailType,
          generatedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Improve existing email using AI
router.post('/improve', async (req, res, next) => {
  try {
    const { error, value } = improveEmailSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { originalEmail, improvementRequest } = value;

    const improvedEmail = await aiService.improveEmail(originalEmail, improvementRequest);

    res.status(200).json({
      success: true,
      message: 'Email improved successfully',
      data: {
        subject: improvedEmail.subject,
        body: improvedEmail.body,
        metadata: {
          improvementRequest,
          improvedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Send email
router.post('/send', async (req, res, next) => {
  try {
    const { error, value } = sendEmailSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }

    const { recipients, subject, body, senderName } = value;

    // Log the incoming data for debugging
    console.log('Send email request:', {
      recipients: recipients.length,
      subject: subject?.substring(0, 50) + '...',
      bodyType: typeof body,
      bodyPreview: body?.substring(0, 100) + '...',
      bodyContainsJSON: body?.includes('{') || body?.includes('}')
    });
    
    // Additional debug: check if body is actually a stringified object
    if (typeof body === 'string' && body.includes('"subject"')) {
      console.log('⚠️  WARNING: Body appears to contain JSON structure!');
      console.log('Full body:', body);
    }

    const result = await emailService.sendEmail({
      recipients,
      subject,
      body,
      senderName
    });

    res.status(200).json({
      success: true,
      message: `Email sent successfully to ${result.successful} out of ${result.totalRecipients} recipients`,
      data: result
    });

  } catch (error) {
    next(error);
  }
});

// Validate email addresses
router.post('/validate', (req, res) => {
  try {
    const { emails } = req.body;
    
    if (!Array.isArray(emails)) {
      return res.status(400).json({
        success: false,
        message: 'Emails must be provided as an array'
      });
    }

    const { validEmails, errors } = emailService.validateEmailList(emails);

    res.status(200).json({
      success: true,
      message: 'Email validation completed',
      data: {
        validEmails,
        invalidEmails: errors,
        totalValid: validEmails.length,
        totalInvalid: errors.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email validation failed',
      error: error.message
    });
  }
});

// Test email service connection
router.get('/test-connection', async (req, res, next) => {
  try {
    const result = await emailService.testConnection();
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
});

// Get email service status
router.get('/status', (req, res) => {
  const isConfigured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
  const isAIConfigured = !!process.env.OPENAI_API_KEY;

  res.status(200).json({
    success: true,
    data: {
      emailService: {
        configured: isConfigured,
        host: process.env.EMAIL_HOST || 'Not configured',
        user: process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/(.{3}).*@/, '$1***@') : 'Not configured'
      },
      aiService: {
        configured: isAIConfigured,
        provider: process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('gsk_') ? 'Groq' : 'OpenAI'
      },
      server: {
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      }
    }
  });
});

module.exports = router;