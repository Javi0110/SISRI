import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ valid: false, message: 'No USNG code provided' }, { status: 400 });
  }

  try {
    // Check if the USNG code exists in the database
    const usngRecord = await prisma.usngsquare.findFirst({
      where: {
        usng: code
      }
    });

    return NextResponse.json({
      valid: !!usngRecord,
      message: usngRecord ? 'Valid USNG code' : 'Invalid USNG code'
    });
  } catch (error) {
    console.error('Error validating USNG code:', error);
    return NextResponse.json(
      { valid: false, message: 'Error validating USNG code' },
      { status: 500 }
    );
  }
} 