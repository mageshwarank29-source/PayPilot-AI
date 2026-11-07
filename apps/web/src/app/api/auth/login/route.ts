import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    const apiUrl = process.env.API_URL;

    if (!apiUrl) {
      return NextResponse.json(
        { success: false, message: "Backend configuration is missing." },
        { status: 500 }
      );
    }

    const backendResponse = await fetch(`${apiUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
      }),
      cache: "no-store",
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data.detail || "Login failed.",
        },
        { status: backendResponse.status }
      );
    }

    if (!data.access_token) {
      return NextResponse.json(
        { success: false, message: "Invalid authentication response." },
        { status: 502 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
    });

    response.cookies.set("paypilot_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 1800,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to connect to the backend." },
      { status: 500 }
    );
  }
}