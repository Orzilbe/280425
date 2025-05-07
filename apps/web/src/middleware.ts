// apps/web/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // קבלת הטוקן מהעוגיות
  const token = request.cookies.get('auth_token')?.value;
  
  // הגדרת נתיבים מוגנים ונתיבי אימות
  const protectedRoutes = ['/topics', '/profile', '/dashboard'];
  const authRoutes = ['/login', '/signup'];

  // בדיקה אם הנתיב הנוכחי הוא נתיב מוגן
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // אם אין טוקן ומנסים לגשת לנתיב מוגן, מעבירים להתחברות
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // אם מחוברים ומנסים לגשת להתחברות/הרשמה, מעבירים לנושאים
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/topics', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/topics/:path*', 
    '/login', 
    '/signup', 
    '/profile',
    '/dashboard'
  ]
};