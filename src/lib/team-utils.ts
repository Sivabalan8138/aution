import prisma from '@/lib/db';

export async function generateNextRegistrationNumber(): Promise<string> {
  const teams = await prisma.team.findMany({
    select: { registrationNumber: true }
  });

  const existingNumbers = new Set(teams.map(t => t.registrationNumber));

  let maxNum = 0;
  for (const t of teams) {
    const match = t.registrationNumber.match(/^REG-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  let nextNum = maxNum + 1;
  let candidate = `REG-${nextNum.toString().padStart(3, '0')}`;

  while (existingNumbers.has(candidate)) {
    nextNum++;
    candidate = `REG-${nextNum.toString().padStart(3, '0')}`;
  }

  return candidate;
}
