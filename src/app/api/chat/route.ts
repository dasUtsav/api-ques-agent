import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { NotionAPI } from 'notion-client';

// Initialize clients
const notion = new NotionAPI();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Extract page IDs from URLs
const PAGE_IDS = {
    dataset: 'b83bd0f1ec09452bb0c2cac811bba88c',
    discovery: 'c66d5236e8ea40df8af114f6d447ab48'
  };

async function fetchNotionPage(pageId: string): Promise<string> {
  try {
    console.log(`Fetching Notion page: ${pageId}`);
    const recordMap = await notion.getPage(pageId);
    
    // Extract all blocks recursively
    let content = '';
    const blocks = Object.values(recordMap.block);
    
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
    
    console.log(`Successfully fetched content from ${pageId}. Length: ${content.length} characters`);
    return content;
  } catch (error) {
    console.error(`Error fetching Notion page ${pageId}:`, error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    console.log('Received question:', question);

    // Fetch documentation from both pages
    console.log('Fetching documentation...');
    const [datasetDoc, discoveryDoc] = await Promise.all([
      fetchNotionPage(PAGE_IDS.dataset),
      fetchNotionPage(PAGE_IDS.discovery)
    ]);

    console.log('Documentation fetched successfully');

    // Combine documentation
    const combinedDocs = `Dataset API Documentation:\n${datasetDoc}\n\nDiscovery API Documentation:\n${discoveryDoc}`;
    console.log('Combined documentation length:', combinedDocs.length);

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