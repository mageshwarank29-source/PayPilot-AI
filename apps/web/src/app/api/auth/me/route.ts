import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("paypilot_token")?.value;

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

    const backendResponse = await fetch(`${apiUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      const response = NextResponse.json(
        { success: false, message: "Session expired. Please log in again." },
        { status: 401 }
      );

      response.cookies.delete("paypilot_token");
      return response;
    }

    return NextResponse.json({
      success: true,
      user: data,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to verify authentication." },
      { status: 500 }
    );
  }
}