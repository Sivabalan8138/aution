import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Checking database initialization...');
  
  const settingsCount = await prisma.eventSettings.count();
  if (settingsCount > 0) {
    console.log('Database already initialized. Skipping seed.');
    return;
  }

  console.log('Database is empty! Seeding initial data...');
  
  await prisma.eventSettings.create({
    data: {
      eventStatus: 'WAITING',
    }
  });

  const teams = [
    { teamName: 'Circuit Kings', participant1Name: 'Alice', participant2Name: 'Bob' },
    { teamName: 'Power Warriors', participant1Name: 'Charlie', participant2Name: 'Dave' },
    { teamName: 'Electron Squad', participant1Name: 'Eve', participant2Name: 'Frank' },
    { teamName: 'Voltage Masters', participant1Name: 'Grace', participant2Name: 'Heidi' },
    { teamName: 'Ohm Force', participant1Name: 'Ivan', participant2Name: 'Judy' }
  ];

  for (let i = 0; i < teams.length; i++) {
    const t = teams[i];
    await prisma.team.create({
      data: {
        registrationNumber: `REG-${(i + 1).toString().padStart(3, '0')}`,
        teamName: t.teamName,
        participant1Name: t.participant1Name,
        participant2Name: t.participant2Name,
        collegeName: 'National Institute of Technology',
        department: 'Electrical Engineering',
        phone: '1234567890',
        email: `contact${i}@example.com`,
        points: 5000,
        status: 'ACTIVE'
      }
    });
  }
  
  const questionsData: any[] = [];
  for (let i = 1; i <= 5; i++) {
    questionsData.push({
      text: `Easy Question ${i}: What is the basic unit of electrical resistance?`,
      answer: `Ohm`,
      difficulty: 'EASY',
      basePoints: 100,
      timeLimit: 30,
      category: 'Basic Electronics'
    });
    questionsData.push({
      text: `Medium Question ${i}: What theorem states that any linear bilateral network can be replaced by an equivalent circuit with a voltage source and series resistance?`,
      answer: `Thevenin's Theorem`,
      difficulty: 'MEDIUM',
      basePoints: 300,
      timeLimit: 30,
      category: 'Circuit Theory'
    });
  }

  for (const q of questionsData) {
    await prisma.question.create({ data: q });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch(e => {
    console.error('Seed error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
