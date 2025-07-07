import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function POST(request: NextRequest) {
  try {
    const { users } = await request.json();

    // Check if test users exist in the database
    const userPromises = users.map(async (user: { email: string }) => {
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser) {
        throw new Error(`User ${user.email} not found in database`);
      }
      return existingUser;
    });

    await Promise.all(userPromises);

    return NextResponse.json(
      { message: 'Test setup successful', users },
      { status: 200 },
    );
  } catch (error) {
    console.error('Test setup error:', error);
    return NextResponse.json(
      { error: 'Test setup failed' },
      { status: 500 },
    );
  }
}

export default POST;
export { POST };
