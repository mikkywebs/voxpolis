import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const filePath = path.join(process.cwd(), 'src/config/sitePages.json');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageKey = searchParams.get('page');

    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);
      if (pageKey && data[pageKey]) {
        return NextResponse.json({ success: true, data: data[pageKey] });
      }
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: 'Pages configuration not found' }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page, data } = body;

    if (!page || !data) {
      return NextResponse.json({ success: false, error: 'Missing page or data payload' }, { status: 400 });
    }

    let currentData: Record<string, any> = {};
    if (fs.existsSync(filePath)) {
      currentData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    currentData[page] = {
      ...(currentData[page] || {}),
      ...data,
      updated_at: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2), 'utf8');

    return NextResponse.json({ success: true, message: `Page ${page} updated successfully`, data: currentData[page] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
