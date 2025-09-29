// Vercel Serverless Function
// Save this as /api/webhook.js in your Vercel project

export default async function handler(request) {
  // Ensure your Environment Variables are set in Vercel project settings
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  // --- Basic Validation ---
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('Server config error: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return new Response('Server configuration error.', { status: 500 });
  }

  // --- Handle POST requests from TradingView ---
  if (request.method === 'POST') {
    try {
      // TradingView sends signals in the request body. In Vercel's Node.js runtime,
      // this is pre-parsed and available in 'request.body'. The original .text() method
      // is not available, which caused the error.
      const signalMessage = request.body;

      // Coerce body to string. If TradingView sends JSON, it's pretty-printed.
      const messageText = (typeof signalMessage === 'object' && signalMessage !== null)
        ? JSON.stringify(signalMessage, null, 2)
        : String(signalMessage || '');

      if (messageText.trim() === '') {
        return new Response('Bad Request: Empty signal message received.', { status: 400 });
      }

      const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

      const apiResponse = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: messageText,
          parse_mode: 'Markdown', // Or 'HTML' if your signals use HTML tags
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        console.error('Telegram API Error:', errorData);
        return new Response(`Failed to send message. Telegram API Error: ${errorData.description}`, { status: 502 });
      }
      
      // Success
      return new Response('Signal forwarded to Telegram successfully.', { status: 200 });

    } catch (error) {
      console.error('Webhook processing error:', error);
      return new Response('Internal Server Error while processing webhook.', { status: 500 });
    }
  }

  // --- Handle GET requests for health checks ---
  if (request.method === 'GET') {
    return new Response(`Webhook is active. Ready to receive POST requests from TradingView.`, { status: 200 });
  }

  // --- Handle other methods ---
  return new Response(`Method Not Allowed. Use POST for signals or GET for health check.`, { status: 405 });
}
