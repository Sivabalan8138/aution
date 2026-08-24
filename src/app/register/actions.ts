'use server';

import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { generateNextRegistrationNumber } from '@/lib/team-utils';

const registerSchema = z.object({
  teamName: z.string().min(2, 'Team Name must be at least 2 characters'),
  participant1Name: z.string().min(2, 'Participant 1 Name is required'),
  participant2Name: z.string().min(2, 'Participant 2 Name is required'),
  collegeName: z.string().min(2, 'College Name is required'),
  department: z.string().min(2, 'Department is required'),
  phone: z.string().optional(),
  email: z.string().email('Valid email is required'),
});

export async function registerTeam(formData: FormData) {
  try {
    const data = {
      teamName: formData.get('teamName') as string,
      participant1Name: formData.get('participant1Name') as string,
      participant2Name: formData.get('participant2Name') as string,
      collegeName: formData.get('collegeName') as string,
      department: formData.get('department') as string,
      phone: (formData.get('phone') as string) || 'N/A',
      email: formData.get('email') as string,
    };

    const validatedData = registerSchema.parse(data);

    // Fetch initial points setting if configured
    const settings = await prisma.eventSettings.findFirst();
    const initialPoints = settings?.initialPoints || 5000;

    const regNumber = await generateNextRegistrationNumber();

    const team = await prisma.team.create({
      data: {
        ...validatedData,
        phone: validatedData.phone || 'N/A',
        registrationNumber: regNumber,
        points: initialPoints,
        status: 'ACTIVE',
      },
    });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const token = await new SignJWT({ role: 'team', teamId: team.id, teamName: team.teamName })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(secret);

    try {
      const cookieStore = await cookies();
      cookieStore.set('team_token', token, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 12 });
    } catch (cookieErr) {
      console.warn('Could not set cookie directly in action:', cookieErr);
    }

    return { success: true, team, token };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const message = error.issues?.[0]?.message || 'Validation failed';
      return { success: false, error: message };
    }

    if (error?.code === 'P2002') {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes('email')) {
        return { success: false, error: 'A team with this email address is already registered.' };
      }
      if (Array.isArray(target) && target.includes('teamName')) {
        return { success: false, error: 'A team with this Team Name already exists.' };
      }
    }

    console.error('Registration error:', error);
    return { success: false, error: error?.message || 'Registration failed. Please try again.' };
  }
}
