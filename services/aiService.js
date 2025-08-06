const OpenAI = require('openai');

class AIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('AI API key is required (OPENAI_API_KEY)');
    }
    
    // Check if it's a Groq API key or OpenAI API key
    const isGroqKey = process.env.OPENAI_API_KEY.startsWith('gsk_');
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: isGroqKey ? 'https://api.groq.com/openai/v1' : undefined,
    });
    
    this.isGroq = isGroqKey;
    this.modelName = isGroqKey ? 'llama3-8b-8192' : 'gpt-3.5-turbo';
  }

  async generateEmail(prompt, context = {}) {
    try {
      const { recipients = [], tone = 'professional', emailType = 'general' } = context;
      
      const systemPrompt = `You are a professional email writer. Generate a well-structured, ${tone} email based on the user's prompt. 

CRITICAL: You MUST return ONLY a valid JSON object with this EXACT structure:
{
  "subject": "Your email subject here",
  "body": "Your complete email content here with proper line breaks"
}

Rules:
- NO text before or after the JSON
- NO markdown formatting
- NO extra quotes or escaping
- The body should be plain text with \\n for line breaks
- Include proper greeting, content, and closing in the body
- Make it sound natural and professional`;

      const userPrompt = `Generate a ${tone} email for the following context:
      
      Prompt: ${prompt}
      ${recipients.length > 0 ? `Recipients: ${recipients.join(', ')}` : ''}
      ${emailType ? `Email Type: ${emailType}` : ''}
      
      Please create an appropriate email that addresses this request professionally.`;

      const completion = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      let response = completion.choices[0].message.content.trim();
      
      // Clean up the response - remove any markdown code blocks or extra text
      if (response.includes('```json')) {
        response = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      }
      if (response.includes('```')) {
        response = response.replace(/```\s*/g, '').replace(/```\s*$/g, '');
      }
      
      // Remove any text before the first { and after the last }
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        response = response.substring(firstBrace, lastBrace + 1);
      }
      
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(response);
        
        // Ensure we return clean strings, not nested JSON
        let subject = typeof parsed.subject === 'string' ? parsed.subject : 'Generated Email';
        let body = typeof parsed.body === 'string' ? parsed.body : response;
        
        // Clean up any JSON artifacts
        subject = subject.replace(/^["']|["']$/g, '').trim();
        body = body.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim();
        
        // Ensure body doesn't contain JSON structure
        if (body.includes('"subject"') || body.includes('"body"')) {
          console.error('🚨 CRITICAL: Body still contains JSON structure after parsing!');
          console.error('Raw response:', response);
          console.error('Parsed object:', parsed);
          console.error('Extracted body:', body);
          throw new Error('Body contains JSON structure');
        }

        console.log('✅ AI Service returning clean data:', {
          subject: subject.substring(0, 50) + '...',
          bodyPreview: body.substring(0, 100) + '...',
          bodyLength: body.length
        });
        
        return {
          subject: subject,
          body: body
        };
      } catch (parseError) {
        console.warn('⚠️  JSON parsing failed, attempting manual extraction');
        console.warn('Parse error:', parseError.message);
        console.warn('Raw response:', response);
        
        // Try to extract subject and body using regex if JSON parsing fails
        let subject = 'Generated Email';
        let body = response.trim();
        
        // Try to extract subject from JSON-like structure
        const subjectMatch = response.match(/"subject"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        if (subjectMatch && subjectMatch[1]) {
          subject = subjectMatch[1].replace(/\\"/g, '"').trim();
        }
        
        // Try to extract body from JSON-like structure
        const bodyMatch = response.match(/"body"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
        if (bodyMatch && bodyMatch[1]) {
          body = bodyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
        } else {
          // Fallback: look for subject line in plain text
          const lines = response.split('\n').filter(line => line.trim());
          const subjectLineIndex = lines.findIndex(line => 
            line.toLowerCase().includes('subject:')
          );
          
          if (subjectLineIndex !== -1) {
            const subjectLine = lines[subjectLineIndex];
            subject = subjectLine.replace(/subject:?\s*/i, '').trim();
            lines.splice(subjectLineIndex, 1);
            body = lines.join('\n').trim();
          }
          
          // Clean up any remaining JSON artifacts
          body = body.replace(/^["']|["']$/g, '').replace(/[{}]/g, '');
        }
        
        console.log('✅ Manual extraction result:', {
          subject: subject.substring(0, 50) + '...',
          bodyPreview: body.substring(0, 100) + '...'
        });
        
        return { 
          subject: subject, 
          body: body 
        };
      }
    } catch (error) {
      console.error('AI Service Error:', error);
      
      if (error.code === 'insufficient_quota') {
        throw new Error(`${this.isGroq ? 'Groq' : 'OpenAI'} API quota exceeded. Please check your billing.`);
      }
      
      if (error.code === 'invalid_api_key') {
        throw new Error(`Invalid ${this.isGroq ? 'Groq' : 'OpenAI'} API key. Please check your configuration.`);
      }
      
      throw new Error(`Failed to generate email: ${error.message}`);
    }
  }

  async improveEmail(originalEmail, improvementRequest) {
    try {
      const systemPrompt = `You are a professional email editor. Improve the given email based on the user's specific request. Maintain professionalism while implementing the requested changes.
      
      Return the response in the following JSON format:
      {
        "subject": "Improved subject line",
        "body": "Improved email body"
      }`;

      const userPrompt = `Please improve this email based on the following request:
      
      Original Email:
      Subject: ${originalEmail.subject}
      Body: ${originalEmail.body}
      
      Improvement Request: ${improvementRequest}
      
      Please provide the improved version.`;

      const completion = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(response);
        return {
          subject: parsed.subject || originalEmail.subject,
          body: parsed.body || response
        };
      } catch (parseError) {
        return {
          subject: originalEmail.subject,
          body: response
        };
      }
    } catch (error) {
      console.error('AI Improvement Error:', error);
      throw new Error(`Failed to improve email: ${error.message}`);
    }
  }
}

module.exports = new AIService();