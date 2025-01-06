import { NextResponse } from 'next/server';

const API_URLS = {
  url1: 'https://crustdata.notion.site/Crustdata-Dataset-API-Detailed-Examples-b83bd0f1ec09452bb0c2cac811bba88c',
  url2: 'https://crustdata.notion.site/Crustdata-Discovery-And-Enrichment-API-c66d5236e8ea40df8af114f6d447ab48#a6c3072d9dd2423bb5dda4a37e2666a6'
};

async function fetchDocumentation(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch documentation from ${url}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`Error fetching documentation from ${url}:`, error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { question } = await request.json();

    // Fetch documentation from both URLs
    const [doc1, doc2] = await Promise.all([
      fetchDocumentation(API_URLS.url1),
      fetchDocumentation(API_URLS.url2)
    ]);

    // TODO: Implement your AI logic here using doc1 and doc2
    // For now, return a placeholder response
    return NextResponse.json({ 
      response: `Got question: "${question}" with documentation from both URLs`
    });

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}