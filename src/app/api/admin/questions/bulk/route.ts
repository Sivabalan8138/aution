import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'SUPER_CHALLENGE'];

function normalizeDifficulty(raw: any): 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_CHALLENGE' {
  if (typeof raw !== 'string') return 'EASY';
  const cleaned = raw.trim().toUpperCase().replace(/[\s\-_]+/g, '_');
  if (VALID_DIFFICULTIES.includes(cleaned)) {
    return cleaned as any;
  }
  if (cleaned.includes('SUPER') || cleaned.includes('CHALLENGE')) return 'SUPER_CHALLENGE';
  if (cleaned.includes('HARD')) return 'HARD';
  if (cleaned.includes('MED')) return 'MEDIUM';
  return 'EASY';
}

function getDefaultPoints(difficulty: string): number {
  switch (difficulty) {
    case 'MEDIUM': return 300;
    case 'HARD': return 500;
    case 'SUPER_CHALLENGE': return 1000;
    case 'EASY':
    default: return 100;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body) ? body : (body.questions || []);

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No question data provided' }, { status: 400 });
    }

    const validQuestions: Array<{
      text: string;
      answer: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_CHALLENGE';
      basePoints: number;
      timeLimit: number;
      category?: string;
    }> = [];

    const errors: string[] = [];

    items.forEach((item: any, idx: number) => {
      const rowNum = idx + 1;
      const text = item.text || item.question || item.Question || item.Text || item.questionText || '';
      const answer = item.answer || item.Answer || item.correctAnswer || '';
      
      if (!text || typeof text !== 'string' || !text.trim()) {
        errors.push(`Row ${rowNum}: Missing question text`);
        return;
      }

      if (!answer || typeof answer !== 'string' || !answer.trim()) {
        errors.push(`Row ${rowNum}: Missing correct answer`);
        return;
      }

      const diff = normalizeDifficulty(item.difficulty || item.Difficulty);
      const parsedPoints = Number(item.basePoints || item.base_points || item.points || item.Points);
      const basePoints = (!isNaN(parsedPoints) && parsedPoints > 0) ? parsedPoints : getDefaultPoints(diff);

      const parsedTime = Number(item.timeLimit || item.time_limit || item.timer || item.Timer);
      const timeLimit = (!isNaN(parsedTime) && parsedTime > 0) ? parsedTime : 30;

      const category = (item.category || item.Category || '').toString().trim() || 'General';

      validQuestions.push({
        text: text.trim(),
        answer: answer.trim(),
        difficulty: diff,
        basePoints,
        timeLimit,
        category
      });
    });

    if (validQuestions.length === 0) {
      return NextResponse.json({ 
        error: 'No valid questions could be extracted from input.',
        errors 
      }, { status: 400 });
    }

    const result = await prisma.question.createMany({
      data: validQuestions
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      totalSubmitted: items.length,
      errors
    });
  } catch (error) {
    console.error('Bulk question upload failed:', error);
    return NextResponse.json({ error: 'Failed to process bulk upload' }, { status: 500 });
  }
}
