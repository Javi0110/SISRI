import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function GET(request: Request) {
  try {
    // Get the USNG code from the request
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    console.log('Looking up USNG code:', code)

    if (!code) {
      return NextResponse.json(
        { error: 'USNG code is required' },
        { status: 400 }
      )
    }

    // Look up the USNG record by code
    const usngRecord = await prisma.usngsquare.findFirst({
      where: { usng: code }
    })

    console.log('USNG lookup result:', usngRecord || 'Not found')

    if (!usngRecord) {
      // Try finding any USNG record to verify database connection
      const anyRecord = await prisma.usngsquare.findFirst({
        take: 1
      })
      
      console.log('Sample USNG record:', anyRecord || 'No records in table')
      
      return NextResponse.json(
        { 
          error: 'USNG code not found',
          code,
          sampleRecordExists: !!anyRecord
        },
        { status: 404 }
      )
    }

    // Return the USNG ID
    return NextResponse.json({
      id: usngRecord.id,
      code: usngRecord.usng
    })

  } catch (error) {
    console.error('Error fetching USNG ID:', error)
    return NextResponse.json(
      { error: 'Failed to fetch USNG ID', details: String(error) },
      { status: 500 }
    )
  }
} 