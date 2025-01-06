import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pdf1 = formData.get('pdf1') as File;
    const pdf2 = formData.get('pdf2') as File;
    const question = formData.get('question') as string;

    // TODO: Implement your PDF processing and AI logic here
    // For now, return a placeholder response
    return NextResponse.json({ 
      response: `Got question: "${question}" with ${pdf1 ? pdf1.name : 'no pdf1'} and ${pdf2 ? pdf2.name : 'no pdf2'}`
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}