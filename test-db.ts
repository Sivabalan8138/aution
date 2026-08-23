import prisma from './src/lib/db';

async function main() {
  try {
    const count = await prisma.team.count();
    console.log('Team count:', count);
  } catch (e) {
    console.error('Error:', e);
  }
}
main();
