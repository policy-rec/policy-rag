import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message, chatId } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Simulate AI response - in a real app, you'd integrate with an AI service
    const responses = [
      "That's an interesting question! Let me think about that...",
      "I understand what you're asking. Here's my perspective on that topic.",
      "Great question! Based on what you've shared, I'd suggest considering the following points.",
      "I can help you with that. Let me break this down into manageable steps.",
      "That's a thoughtful observation. Here's what I think about that situation.",
      "I appreciate you sharing that with me. Here's how I would approach this problem.",
      "Interesting point! Let me provide some insights on that topic.",
      "I can see why you'd be curious about that. Here's what I know about it.",
      "That's a great question that many people have. Let me explain what I understand.",
      "I'd be happy to help you explore that topic further. Here are some thoughts."
    ]

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    // Get a random response
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    
    // Add some context based on the message
    let contextualResponse = randomResponse
    if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
      contextualResponse = "Hello! I'm here to help you with any questions or topics you'd like to discuss. What would you like to talk about?"
    } else if (message.toLowerCase().includes('help')) {
      contextualResponse = "I'm here to assist you! I can help with a wide variety of topics including general knowledge, problem-solving, creative writing, and more. What specific area would you like help with?"
    } else if (message.toLowerCase().includes('thank')) {
      contextualResponse = "You're very welcome! I'm glad I could help. Is there anything else you'd like to discuss or any other questions you have?"
    }

    return NextResponse.json({
      message: contextualResponse,
      chatId: chatId || 'default',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
