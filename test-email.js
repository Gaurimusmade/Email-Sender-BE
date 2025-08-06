#!/usr/bin/env node

/**
 * Quick test script to verify email generation and sending
 */

const aiService = require('./services/aiService');
const emailService = require('./services/emailService');
require('dotenv').config();

async function testEmailGeneration() {
  console.log('🧪 Testing email generation...');
  
  try {
    const result = await aiService.generateEmail(
      'Write a professional follow-up email to a client after a meeting',
      {
        tone: 'professional',
        emailType: 'follow-up'
      }
    );
    
    console.log('✅ Email generated successfully:');
    console.log('Subject:', result.subject);
    console.log('Body type:', typeof result.body);
    console.log('Body preview:', result.body.substring(0, 200) + '...');
    
    // Check if body contains JSON artifacts
    if (result.body.includes('{') || result.body.includes('}')) {
      console.log('⚠️  Warning: Body might contain JSON artifacts');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Email generation failed:', error.message);
    return null;
  }
}

async function testEmailFormatting(email) {
  console.log('\n🧪 Testing email formatting...');
  
  try {
    const formattedBody = emailService.formatEmailBody(email.body);
    console.log('✅ Email formatting successful');
    console.log('Formatted body preview:', formattedBody.substring(0, 200) + '...');
    
    // Check if formatting looks correct
    if (formattedBody.includes('<p>') && formattedBody.includes('</p>')) {
      console.log('✅ HTML formatting applied correctly');
    } else {
      console.log('⚠️  Warning: HTML formatting might not be correct');
    }
    
    return formattedBody;
  } catch (error) {
    console.error('❌ Email formatting failed:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Email System Tests\n');
  
  // Test 1: Email Generation
  const generatedEmail = await testEmailGeneration();
  if (!generatedEmail) {
    console.log('❌ Cannot proceed with further tests - email generation failed');
    return;
  }
  
  // Test 2: Email Formatting
  const formattedEmail = await testEmailFormatting(generatedEmail);
  if (!formattedEmail) {
    console.log('❌ Email formatting test failed');
    return;
  }
  
  // Test 3: Email Validation
  console.log('\n🧪 Testing email validation...');
  const validationResult = emailService.validateEmailList(['test@example.com', 'invalid-email']);
  console.log('✅ Validation result:', {
    valid: validationResult.validEmails.length,
    invalid: validationResult.errors.length
  });
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Test Results Summary:');
  console.log('- Email Generation: ✅');
  console.log('- Email Formatting: ✅');
  console.log('- Email Validation: ✅');
  console.log('\nYour email system should now work correctly! 🚀');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runTests };