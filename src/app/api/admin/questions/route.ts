import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const questions = await prisma.question.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(questions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const newQuestion = await prisma.question.create({
      data: {
        text: data.text,
        answer: data.answer,
        difficulty: data.difficulty,
        basePoints: data.basePoints,
        timeLimit: data.timeLimit || 30,
        category: data.category
      }
    });
    return NextResponse.json(newQuestion);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 });
  }
}
