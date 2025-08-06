#!/usr/bin/env node

/**
 * Test AI service specifically to debug JSON issues
 */

const aiService = require('./services/aiService');
require('dotenv').config();

async function testAIGeneration() {
  console.log('🧪 Testing AI email generation...\n');
  
  try {
    const result = await aiService.generateEmail(
      'Write a birthday invitation for my friend Nitya',
      {
        tone: 'friendly',
        emailType: 'invitation'
      }
    );
    
    console.log('✅ AI Generation Result:');
    console.log('Subject Type:', typeof result.subject);
    console.log('Body Type:', typeof result.body);
    console.log('Subject:', result.subject);
    console.log('\nBody:');
    console.log(result.body);
    
    // Check for JSON artifacts
    const hasJSONArtifacts = result.body.includes('"subject"') || result.body.includes('"body"') || result.body.includes('{') || result.body.includes('}');
    
    if (hasJSONArtifacts) {
      console.log('\n❌ PROBLEM: Body contains JSON artifacts!');
      console.log('Raw body:', JSON.stringify(result.body));
    } else {
      console.log('\n✅ SUCCESS: Clean email content generated!');
    }
    
    return result;
  } catch (error) {
    console.error('❌ AI generation failed:', error.message);
    return null;
  }
}

async function runTest() {
  console.log('🚀 AI Service Test\n');
  
  const result = await testAIGeneration();
  
  if (result) {
    console.log('\n📊 Test Summary:');
    console.log('- Subject length:', result.subject.length);
    console.log('- Body length:', result.body.length);
    console.log('- Contains newlines:', result.body.includes('\n'));
    console.log('- Contains JSON:', result.body.includes('"'));
  }
}

// Run test if called directly
if (require.main === module) {
  runTest().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runTest };