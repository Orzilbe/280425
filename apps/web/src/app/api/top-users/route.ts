// apps/web/src/app/api/top-users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '../../lib/dbUtils';
import { verifyAuthToken } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    // וידוא אימות המשתמש
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'לא מורשה' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    // וידוא תוקף הטוקן
    const userData = verifyAuthToken(token);
    
    if (!userData) {
      return NextResponse.json({ message: 'טוקן לא תקף' }, { status: 401 });
    }

    // שאילתה מתוקנת - שימוש ב-UserRank במקום Rank (מילה שמורה)
    const query = `
      SELECT 
        u.UserId, 
        u.FirstName, 
        u.LastName, 
        u.Score, 
        u.ProfilePicture,
        @rank := @rank + 1 AS UserRank
      FROM 
        users u, 
        (SELECT @rank := 0) r
      WHERE 
        u.IsActive = 1
      ORDER BY 
        u.Score DESC
      LIMIT 5
    `;

    // ביצוע השאילתה באמצעות פונקציית executeQuery המותאמת
    const response = await executeQuery(
      query,
      [],
      'Fetch top users'
    );

    // בדיקה אם השאילתה הצליחה
    if (!response.success) {
      console.error('Database query failed:', response.error);
      return NextResponse.json(
        { message: 'שגיאה בשאילתת מסד הנתונים' }, 
        { status: 500 }
      );
    }

    // החזרת התוצאות
    return NextResponse.json(response.result);
  } catch (error) {
    console.error('Error fetching top users:', error);
    return NextResponse.json(
      { message: 'שגיאה בלתי צפויה במהלך שליפת המשתמשים המובילים' },
      { status: 500 }
    );
  }
}