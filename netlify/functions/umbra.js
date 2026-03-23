// netlify/functions/umbra.js
// Groq API proxy — CommonJS format for maximum Netlify compatibility

exports.handler = async function(event) {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  // Parse body
  let messages
  try {
    const body = JSON.parse(event.body)
    messages = body.messages
    if (!Array.isArray(messages)) throw new Error('Invalid messages')
  } catch(e) {
    return { statusCode: 400, body: 'Bad request' }
  }

  // API key from Netlify environment
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error('GROQ_API_KEY not set')
    return { statusCode: 500, body: 'API key not configured' }
  }

  // Call Groq
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages,
        max_tokens:  200,
        temperature: 0.9,
        stream:      false,
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      console.error('Groq error:', groqRes.status, errText)
      return { statusCode: groqRes.status, body: 'Groq API error' }
    }

    const data = await groqRes.json()

    return {
      statusCode: 200,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    }
  } catch (err) {
    console.error('Proxy error:', err)
    return { statusCode: 500, body: 'Internal error' }
  }
}
