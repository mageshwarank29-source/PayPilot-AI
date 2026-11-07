
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get("paypilot_token")?.value;
}

export async function GET() {
  try {
    const token = await getAuthToken();

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const apiUrl = process.env.API_URL;

    if (!apiUrl) {
      return NextResponse.json(
        { success: false, message: "Backend configuration is missing." },
        { status: 500 }
      );
    }

    const backendResponse = await fetch(`${apiUrl}/accounts/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await backendResponse.json();

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to load accounts." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthToken();

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const apiUrl = process.env.API_URL;

    if (!apiUrl) {
      return NextResponse.json(
        { success: false, message: "Backend configuration is missing." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const backendResponse = await fetch(`${apiUrl}/accounts/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await backendResponse.json();

    return NextResponse.json(data, {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to create account." },
      { status: 500 }
    );
  }
}
