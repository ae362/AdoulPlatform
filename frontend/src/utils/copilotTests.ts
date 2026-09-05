/**
 * Test/Demo: Copilot Service Integration
 * 
 * To use this:
 * 1. Add VITE_OPENAI_API_KEY to your .env.local
 * 2. Open browser console (F12)
 * 3. Import and test the service
 */

import { getCopilotService } from '@/services/copilotService';

/**
 * Test 1: Check if API is configured
 */
export async function testApiConfiguration() {
  const copilot = getCopilotService();
  const isConfigured = copilot.isConfigured();
  
  console.log('🔍 API Configuration Status:', isConfigured);
  console.log('✓ if true: API key is set and ready');
  console.log('✗ if false: Add VITE_OPENAI_API_KEY to .env.local');
  
  return isConfigured;
}

/**
 * Test 2: Check API Status (connectivity)
 */
export async function testApiStatus() {
  const copilot = getCopilotService();
  
  try {
    console.log('🔄 Checking API status...');
    const isOnline = await copilot.checkStatus();
    
    if (isOnline) {
      console.log('✓ API is online and reachable');
    } else {
      console.log('✗ API status check failed');
    }
    
    return isOnline;
  } catch (error) {
    console.error('❌ API Status Error:', error);
    return false;
  }
}

/**
 * Test 3: Send a simple message
 */
export async function testSendMessage() {
  const copilot = getCopilotService();
  
  if (!copilot.isConfigured()) {
    console.error('❌ API not configured');
    return null;
  }
  
  try {
    console.log('📤 Sending test message...');
    const response = await copilot.sendMessage(
      'مرحباً، كيف حالك؟'
    );
    
    console.log('📥 Response:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return null;
  }
}

/**
 * Test 4: Send message with conversation history
 */
export async function testConversationHistory() {
  const copilot = getCopilotService();
  
  if (!copilot.isConfigured()) {
    console.error('❌ API not configured');
    return null;
  }
  
  try {
    console.log('📤 Sending message with history...');
    const history = [
      {
        role: 'user' as const,
        content: 'سؤالي الأول'
      },
      {
        role: 'assistant' as const,
        content: 'هذا ردي على السؤال الأول'
      }
    ];
    
    const response = await copilot.sendMessage(
      'سؤالي الثاني متعلق بالأول',
      history
    );
    
    console.log('📥 Response with context:', response);
    return response;
  } catch (error) {
    console.error('❌ Error:', error);
    return null;
  }
}

/**
 * Test 5: Stream message (real-time response)
 */
export async function testStreamMessage() {
  const copilot = getCopilotService();
  
  if (!copilot.isConfigured()) {
    console.error('❌ API not configured');
    return null;
  }
  
  try {
    console.log('📤 Streaming message...');
    let fullResponse = '';
    
    await copilot.streamMessage(
      'شرح لي عن عقد الزواج في المغرب',
      [],
      (chunk) => {
        fullResponse += chunk;
        process.stdout.write(chunk); // Live output
      }
    );
    
    console.log('\n✓ Stream complete');
    return fullResponse;
  } catch (error) {
    console.error('❌ Streaming error:', error);
    return null;
  }
}

/**
 * Test 6: Run all tests
 */
export async function runAllTests() {
  console.log('🚀 Starting Copilot Integration Tests\n');
  
  console.log('─'.repeat(50));
  console.log('Test 1: API Configuration');
  console.log('─'.repeat(50));
  const configured = await testApiConfiguration();
  
  if (!configured) {
    console.error('\n❌ API not configured. Stopping tests.');
    return;
  }
  
  console.log('\n─'.repeat(50));
  console.log('Test 2: API Status');
  console.log('─'.repeat(50));
  const online = await testApiStatus();
  
  if (!online) {
    console.error('\n❌ API not online. Check your connection.');
    return;
  }
  
  console.log('\n─'.repeat(50));
  console.log('Test 3: Simple Message');
  console.log('─'.repeat(50));
  await testSendMessage();
  
  console.log('\n─'.repeat(50));
  console.log('Test 4: Conversation History');
  console.log('─'.repeat(50));
  await testConversationHistory();
  
  console.log('\n─'.repeat(50));
  console.log('✓ All tests completed!');
  console.log('─'.repeat(50));
}

/**
 * Usage Examples
 * 
 * In browser console:
 * 
 * // Test configuration
 * import { testApiConfiguration } from '@/utils/copilotTests';
 * testApiConfiguration();
 * 
 * // Test all
 * import { runAllTests } from '@/utils/copilotTests';
 * runAllTests();
 */
