import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const API_URLS = {
  url1: 'https://crustdata.notion.site/Crustdata-Dataset-API-Detailed-Examples-b83bd0f1ec09452bb0c2cac811bba88c',
  url2: 'https://crustdata.notion.site/Crustdata-Discovery-And-Enrichment-API-c66d5236e8ea40df8af114f6d447ab48'
};

async function fetchDocumentation(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch documentation from ${url}`);
    }
    const html = await response.text();
    
    // Extract text content from HTML
    // Remove HTML tags and decode entities
    const text = html
      .replace(/<[^>]*>/g, '')  // Remove HTML tags
      .replace(/&nbsp;/g, ' ')  // Replace &nbsp; with spaces
      .replace(/&amp;/g, '&')   // Replace &amp; with &
      .replace(/&lt;/g, '<')    // Replace &lt; with <
      .replace(/&gt;/g, '>')    // Replace &gt; with >
      .replace(/&quot;/g, '"')  // Replace &quot; with "
      .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
      .trim();                  // Remove leading/trailing whitespace
    
    return text;
  } catch (error) {
    console.error(`Error fetching documentation from ${url}:`, error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    console.log('Received question:', question);

    // Fetch documentation from both URLs
    console.log('Fetching documentation...');
    const [doc1, doc2] = await Promise.all([
      fetchDocumentation(API_URLS.url1),
      fetchDocumentation(API_URLS.url2)
    ]);

    console.log('Documentation fetched successfully');
    
    // Combine documentation
    const combinedDocs = `Dataset API Documentation:\n${doc1}\n\nDiscovery API Documentation:\n${doc2}`;
    console.log('Combined documentation length:', combinedDocs.length);

    // Create completion with OpenAI
    console.log('Sending request to OpenAI...');
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an API documentation assistant for Crustdata. Answer questions about the Dataset API and Discovery & Enrichment API based on their documentation. Provide specific examples when available. If the information isn't in the documentation, say so."
        },
        {
          role: "user",
          content: `Documentation:\n${combinedDocs}\n\nQuestion: ${question}`
        }
      ],
      model: process.env.OPENAI_MODEL_NAME || "gpt-4-turbo-preview",
      temperature: 0,
    });

    console.log('Received response from OpenAI');

    return NextResponse.json({ 
      response: completion.choices[0].message.content
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}