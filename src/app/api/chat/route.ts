import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Client } from '@notionhq/client';

// Initialize clients
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchNotionPage(pageId: string): Promise<string> {
  console.log(`Fetching Notion page: ${pageId}`);
  try {
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    
    let content = '';
    for (const block of blocks.results) {
      if ('paragraph' in block) {
        const paragraph = block.paragraph.rich_text;
        content += paragraph.map(text => text.plain_text).join('') + '\n\n';
      }
    }
    
    console.log(`Successfully fetched content from ${pageId}. Length: ${content.length} characters`);
    return content;
  } catch (error) {
    console.error(`Error fetching Notion page ${pageId}:`, error);
    throw new Error(`Failed to fetch Notion page: ${error.message}`);
  }
}

export async function POST(request: Request) {
  try {
    // Log environment variables (without sensitive values)
    console.log('Environment check:', {
      hasNotionKey: !!process.env.NOTION_API_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      modelName: process.env.OPENAI_MODEL_NAME,
      pageId1: process.env.NOTION_PAGE_ID_1,
      pageId2: process.env.NOTION_PAGE_ID_2,
    });

    const { question } = await request.json();
    console.log('Received question:', question);

    // Fetch documentation
    console.log('Fetching documentation...');
    const [doc1, doc2] = await Promise.all([
      fetchNotionPage(process.env.NOTION_PAGE_ID_1!),
      fetchNotionPage(process.env.NOTION_PAGE_ID_2!)
    ]);

    console.log('Documentation fetched successfully');

    // Combine documentation
    const combinedDocs = `Doc1:\n${doc1}\n\nDoc2:\n${doc2}`;
    console.log('Combined documentation length:', combinedDocs.length);

    // Create completion with OpenAI
    console.log('Sending request to OpenAI...');
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an API documentation assistant. Use the provided API documentation to answer user questions accurately and concisely. If the information isn't in the documentation, say so."
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
    console.error('Detailed error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}