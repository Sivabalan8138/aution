'use server';

import prisma from '@/lib/db';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

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

    // Generate Registration Number (e.g., REG-001)
    // For concurrency safety, normally we'd use a sequence or UUID, but requirement says REG-XXX.
    // In a high concurrency environment, we'd do this in a transaction or use a sequence.
    // We'll count existing teams to generate the next number.
    const count = await prisma.team.count();
    const regNumber = `REG-${(count + 1).toString().padStart(3, '0')}`;

    const team = await prisma.team.create({
      data: {
        ...validatedData,
        phone: validatedData.phone || 'N/A',
        registrationNumber: regNumber,
        points: 5000,
        status: 'ACTIVE',
      },
    });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret');
    const token = await new SignJWT({ role: 'team', teamId: team.id, teamName: team.teamName })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(secret);

    const cookieStore = await cookies();
    cookieStore.set('team_token', token, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 12 });

    return { success: true, team, token };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues?.[0]?.message || 'Validation failed';
      return { success: false, error: message };
    }
    console.error('Registration error:', error);
    return { success: false, error: 'Registration failed. Please try again.' };
  }
}
