
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.full_name || !body.email || !body.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name, email and password are required.",
        },
        { status: 400 }
      );
    }

    const apiUrl = process.env.API_URL;

    if (!apiUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Backend configuration is missing.",
        },
        { status: 500 }
      );
    }

    const registerResponse = await fetch(`${apiUrl}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_name: body.full_name,
        email: body.email,
        password: body.password,
      }),
      cache: "no-store",
    });

    const registerData = await registerResponse.json();

    if (!registerResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: registerData.detail || "Registration failed.",
        },
        { status: registerResponse.status }
      );
    }

    const loginResponse = await fetch(`${apiUrl}/auth/login`, {
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

    const loginData = await loginResponse.json();

    if (!loginResponse.ok || !loginData.access_token) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        message: "Account created successfully. Please sign in.",
      }, { status: 201 });
    }

    const response = NextResponse.json({
      success: true,
      authenticated: true,
      message: "Account created successfully.",
    });

    response.cookies.set("paypilot_token", loginData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 1800,
    });

    return response;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to connect to the backend.",
      },
      { status: 500 }
    );
  }
}
