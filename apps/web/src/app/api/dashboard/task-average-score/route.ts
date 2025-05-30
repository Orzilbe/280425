import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "../../../lib/dbUtils";
import { verifyAuthToken } from "../../../../lib/auth";
import { RowDataPacket } from "mysql2";

interface TaskAverageScoreResult extends RowDataPacket {
  AgeRange: string;
  avg_score: number;
  task_count: number;
  user_count: number;
}

interface TaskTypeOption extends RowDataPacket {
  TaskType: string;
  task_count: number;
}

interface EnglishLevelOption extends RowDataPacket {
  EnglishLevel: string;
  user_count: number;
}

export async function GET(request: NextRequest) {
  try {
    // וידוא אימות המשתמש
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "לא מורשה" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const userData = verifyAuthToken(token);

    if (!userData) {
      return NextResponse.json({ message: "טוקן לא תקף" }, { status: 401 });
    }

    // קבלת פרמטרים מהבקשה
    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get("taskType") || "all";
    const englishLevel = searchParams.get("englishLevel") || "all";

    let whereClause = "";
    let queryParams: any[] = [];

    // אם נבחר סוג משימה ספציפי
    if (taskType !== "all") {
      whereClause += " AND t.TaskType = ?";
      queryParams.push(taskType);
    }

    // אם נבחרה רמת אנגלית ספציפית
    if (englishLevel !== "all") {
      whereClause += " AND u.EnglishLevel = ?";
      queryParams.push(englishLevel);
    }

    // שאילתא לחישוב ציון ממוצע של משימות לפי טווח גילאים (עם פילטור לפי רמת אנגלית)
    const taskAverageScoreQuery = `
      SELECT 
        u.AgeRange,
        AVG(t.TaskScore) as avg_score,
        COUNT(t.TaskId) as task_count,
        COUNT(DISTINCT u.UserId) as user_count
      FROM Tasks t
      JOIN Users u ON t.UserId = u.UserId
      WHERE t.CompletionDate IS NOT NULL 
        AND t.TaskScore IS NOT NULL 
        AND t.TaskScore >= 0
        AND u.IsActive = 1
        ${whereClause}
      GROUP BY u.AgeRange
      ORDER BY 
        CASE 
          WHEN u.AgeRange = '0-17' THEN 1
          WHEN u.AgeRange = '18-24' THEN 2
          WHEN u.AgeRange = '25-34' THEN 3
          WHEN u.AgeRange = '35-44' THEN 4
          WHEN u.AgeRange = '45-54' THEN 5
          WHEN u.AgeRange = '55+' THEN 6
          ELSE 7
        END
    `;

    // שאילתא לקבלת כל סוגי המשימות הקיימים
    const taskTypesQuery = `
      SELECT 
        TaskType,
        COUNT(*) as task_count
      FROM Tasks 
      WHERE CompletionDate IS NOT NULL 
        AND TaskScore IS NOT NULL 
        AND TaskScore >= 0
      GROUP BY TaskType
      ORDER BY TaskType
    `;

    // שאילתא לקבלת כל רמות האנגלית הקיימות
    const englishLevelsQuery = `
      SELECT 
        u.EnglishLevel,
        COUNT(DISTINCT u.UserId) as user_count
      FROM Users u
      JOIN Tasks t ON u.UserId = t.UserId
      WHERE t.CompletionDate IS NOT NULL 
        AND t.TaskScore IS NOT NULL 
        AND t.TaskScore >= 0
        AND u.IsActive = 1
      GROUP BY u.EnglishLevel
      ORDER BY 
        CASE 
          WHEN u.EnglishLevel = 'beginner' THEN 1
          WHEN u.EnglishLevel = 'intermediate' THEN 2
          WHEN u.EnglishLevel = 'advanced' THEN 3
          ELSE 4
        END
    `;

    // ביצוע השאילתות
    const [averageScoreRes, taskTypesRes, englishLevelsRes] = await Promise.all(
      [
        executeQuery(
          taskAverageScoreQuery,
          queryParams,
          "Fetch task average scores by age range"
        ),
        executeQuery(taskTypesQuery, [], "Fetch task types"),
        executeQuery(englishLevelsQuery, [], "Fetch english levels"),
      ]
    );

    // בדיקה אם השאילתות הצליחו
    if (
      !averageScoreRes.success ||
      !taskTypesRes.success ||
      !englishLevelsRes.success
    ) {
      console.error("Database query failed");
      return NextResponse.json(
        { message: "שגיאה בשאילתת מסד הנתונים" },
        { status: 500 }
      );
    }

    const averageScoreData = averageScoreRes.result as RowDataPacket[];
    const taskTypes = taskTypesRes.result as TaskTypeOption[];
    const englishLevels = englishLevelsRes.result as RowDataPacket[];

    // עיבוד הנתונים לפורמט מתאים לתרשים
    const processedData = averageScoreData.map((row: any) => ({
      ageRange: row.AgeRange,
      avgScore: Math.round(row.avg_score * 100) / 100,
      taskCount: row.task_count,
      userCount: row.user_count,
    }));

    const response = {
      data: processedData,
      taskTypes: taskTypes.map((t) => ({
        value: t.TaskType,
        label: t.TaskType,
        count: t.task_count,
      })),
      englishLevels: englishLevels.map((level: any) => ({
        value: level.EnglishLevel,
        label: level.EnglishLevel,
        count: level.user_count,
      })),
      selectedTaskType: taskType,
      selectedEnglishLevel: englishLevel,
      totalRecords: averageScoreData.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching task average score data:", error);
    return NextResponse.json({ message: "שגיאה בלתי צפויה" }, { status: 500 });
  }
}
