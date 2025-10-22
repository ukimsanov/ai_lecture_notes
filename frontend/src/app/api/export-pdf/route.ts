import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Maximum execution time for serverless function

export async function POST(request: NextRequest) {
  try {
    const { html, title } = await request.json();

    if (!html) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }

    // Detect environment: production (Vercel) vs development (local)
    const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';

    let browser;

    if (isProduction) {
      // Production: Use puppeteer-core + @sparticuz/chromium (Vercel-compatible)
      const puppeteerCore = (await import('puppeteer-core')).default;
      const chromium = (await import('@sparticuz/chromium')).default;

      browser = await puppeteerCore.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      // Development: Use full puppeteer (includes Chrome)
      const puppeteer = (await import('puppeteer')).default;

      browser = await puppeteer.launch({
        headless: true,
      });
    }

    const page = await browser.newPage();

    // Set content with proper styling - networkidle0 waits for all network requests (fonts, etc.)
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'load'],
    });

    // Generate PDF with quality settings
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm',
      },
    });

    await browser.close();

    // Return PDF as response (convert Uint8Array to Buffer for NextResponse)
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title || 'lecture-notes'}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
