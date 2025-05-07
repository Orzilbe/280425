// apps/web/src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/login`;
    console.log('Attempting to connect to API:', apiUrl);
    
    // Make a real API call to your backend
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password
      })
    });

    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    console.log('Response content type:', contentType);
    
    // Handle different response types
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      if (response.ok) {
        return NextResponse.json({
          success: true,
          message: 'Login successful',
          token: data.token,
          user: data.user
        });
      } else {
        return NextResponse.json(
          { 
            success: false,
            message: data.message || 'Login failed', 
            details: data.details 
          },
          { status: response.status }
        );
      }
    } else {
      // Not JSON, get text instead
      const textResponse = await response.text();
      console.error('Non-JSON response received:', textResponse.substring(0, 200));
      
      return NextResponse.json(
        { 
          success: false,
          message: 'Backend returned non-JSON response', 
          status: response.status,
          contentType: contentType || 'unknown'
        },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Login failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}