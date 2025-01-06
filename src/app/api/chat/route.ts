import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { NotionAPI } from 'notion-client';

// Initialize clients with error handling
let notion: NotionAPI;
let openai: OpenAI;

try {
  notion = new NotionAPI();
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} catch (error) {
  console.error('Error initializing clients:', error);
}

const API_URLS = {
  dataset: 'https://crustdata.notion.site/Crustdata-Dataset-API-Detailed-Examples-b83bd0f1ec09452bb0c2cac811bba88c',
  discovery: 'https://crustdata.notion.site/Crustdata-Discovery-And-Enrichment-API-c66d5236e8ea40df8af114f6d447ab48'
};

function getPageId(url: string): string {
  return url.split('-').pop()!;
}

async function fetchNotionPage(url: string): Promise<string> {
  try {
    console.log(`Starting to fetch Notion page from URL: ${url}`);
    const pageId = getPageId(url);
    console.log(`Extracted page ID: ${pageId}`);
    
    const recordMap = await notion.getPage(pageId);
    console.log('Successfully got page record map');
    
    // Extract all blocks recursively
    let content = '';
    const blocks = Object.values(recordMap.block);
    console.log(`Found ${blocks.length} blocks`);
    
    for (const block of blocks) {
      const value = block.value;
      if (value.type === 'text' && value.properties?.title) {
        content += value.properties.title.join('') + '\n';
      } else if (value.type === 'header' && value.properties?.title) {
        content += '\n## ' + value.properties.title.join('') + '\n';
      } else if (value.type === 'sub_header' && value.properties?.title) {
        content += '\n### ' + value.properties.title.join('') + '\n';
      } else if (value.type === 'code' && value.properties?.title) {
        content += '\n```\n' + value.properties.title.join('') + '\n```\n';
      } else if (value.properties?.title) {
        content += value.properties.title.join('') + '\n';
      }
    }
    
    console.log(`Successfully extracted content, length: ${content.length} characters`);
    return content;
  } catch (error) {
    console.error(`Error fetching Notion page ${url}:`, error);
    throw new Error(`Failed to fetch Notion page: ${error.message}`);
  }
}

export async function POST(request: Request) {
  console.log('Starting POST request handler');
  try {
    // Check environment variables
    console.log('Environment check:', {
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      modelName: process.env.OPENAI_MODEL_NAME,
    });

    // Parse request
    const { question } = await request.json();
    console.log('Received question:', question);

    // Fetch documentation
    console.log('Starting to fetch documentation...');
    const [datasetDoc, discoveryDoc] = await Promise.all([
      fetchNotionPage(API_URLS.dataset),
      fetchNotionPage(API_URLS.discovery)
    ]);
    console.log('Successfully fetched both documents');

    // Combine documentation
    const combinedDocs = `Dataset API Documentation:\n${datasetDoc}\n\nDiscovery API Documentation:\n${discoveryDoc}`;
    console.log('Documentation combined, total length:', combinedDocs.length);

    // Create completion with OpenAI
    console.log('Sending request to OpenAI...');
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an API documentation assistant for Crustdata. Answer questions about the Dataset API and Discovery & Enrichment API based on their documentation. Include specific examples from the documentation when available. If the information isn't in the documentation, say so."
        },
        {
          role: "user",
          content: `Documentation:\n${combinedDocs}\n\nQuestion: ${question}`
        }
      ],
      model: process.env.OPENAI_MODEL_NAME || "gpt-4o",
      temperature: 0,
    });

    console.log('Successfully received OpenAI response');

    return NextResponse.json({ 
      response: completion.choices[0].message.content
    });

  } catch (error) {
    console.error('Detailed error in POST handler:', error);
    // Return the actual error message for debugging
    return NextResponse.json(
      { 
        error: `Failed to get response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}