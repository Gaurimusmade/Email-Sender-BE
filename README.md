# Email Sender Backend

AI-powered email generation and sending service built with Node.js and Express.

## Features

- 🤖 AI-powered email generation using OpenAI GPT
- 📧 Professional email sending with SMTP
- ✅ Email validation and error handling
- 🔒 Security middleware (Helmet, CORS, Rate limiting)
- 🎯 Multiple email tones and types
- 📊 Comprehensive status and health endpoints

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   - Copy `env.example` to `.env`
   - Fill in your configuration:
     ```env
     # OpenAI Configuration
     OPENAI_API_KEY=your_openai_api_key_here
     
     # Email Configuration (Gmail SMTP example)
     EMAIL_HOST=smtp.gmail.com
     EMAIL_PORT=587
     EMAIL_USER=your_email@gmail.com
     EMAIL_PASS=your_app_password
     
     # Server Configuration
     PORT=5000
     NODE_ENV=development
     
     # CORS Configuration
     FRONTEND_URL=http://localhost:3000
     ```

3. **Gmail Setup (if using Gmail):**
   - Enable 2-factor authentication
   - Generate an App Password
   - Use the App Password in `EMAIL_PASS`

4. **Start the server:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Email Generation
- `POST /api/email/generate` - Generate email using AI
- `POST /api/email/improve` - Improve existing email with AI

### Email Sending
- `POST /api/email/send` - Send email to recipients
- `POST /api/email/validate` - Validate email addresses

### Service Status
- `GET /api/email/status` - Get service configuration status
- `GET /api/email/test-connection` - Test email service connection
- `GET /api/health` - Health check endpoint

## Usage Examples

### Generate Email
```javascript
POST /api/email/generate
{
  "prompt": "Write a follow-up email to potential clients after a product demo",
  "recipients": ["client@example.com"],
  "tone": "professional",
  "emailType": "follow-up"
}
```

### Send Email
```javascript
POST /api/email/send
{
  "recipients": ["user1@example.com", "user2@example.com"],
  "subject": "Your Generated Email Subject",
  "body": "Your email content here...",
  "senderName": "Your Company"
}
```

## Email Tones
- `professional` - Formal business communication
- `casual` - Relaxed, friendly tone
- `formal` - Very formal, official communication
- `friendly` - Warm and approachable

## Email Types
- `general` - General purpose emails
- `business` - Business communications
- `marketing` - Marketing and promotional emails
- `follow-up` - Follow-up communications
- `invitation` - Event or meeting invitations

## Security Features

- Rate limiting (100 requests per 15 minutes per IP)
- Helmet.js security headers
- CORS protection
- Input validation with Joi
- Error handling middleware

## Error Handling

The API provides detailed error responses:
- Validation errors with specific field details
- OpenAI API errors with helpful messages
- Email service errors with troubleshooting hints
- Network and authentication error handling

## Development

```bash
# Install nodemon for development
npm install -g nodemon

# Run in development mode
npm run dev
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for email generation | Yes |
| `EMAIL_HOST` | SMTP server host | Yes |
| `EMAIL_PORT` | SMTP server port | Yes |
| `EMAIL_USER` | SMTP username/email | Yes |
| `EMAIL_PASS` | SMTP password/app password | Yes |
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment mode | No (default: development) |
| `FRONTEND_URL` | Frontend URL for CORS | No (default: http://localhost:3000) |