import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "../../../lib/dbUtils";
import { verifyAuthToken } from "../../../../lib/auth";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "לא מורשה" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const userData = verifyAuthToken(token);

    if (!userData) {
      return NextResponse.json({ message: "טוקן לא תקף" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get("taskType");

    if (!taskType || taskType === "all") {
      return NextResponse.json([]); // Return empty if no specific task type
    }

    const query = `
      SELECT
        t.Level,
        u.EnglishLevel,
        ROUND(AVG(t.TaskScore), 1) as avgScore
      FROM Tasks t
      JOIN Users u ON t.UserId = u.UserId
      WHERE t.TaskType = ? AND t.CompletionDate IS NOT NULL AND u.EnglishLevel IS NOT NULL
      GROUP BY t.Level, u.EnglishLevel
      ORDER BY t.Level ASC, u.EnglishLevel ASC;
    `;

    const params = [taskType];

    const response = await executeQuery(
      query,
      params,
      "Fetch level score performance by English level"
    );

    if (!response.success) {
      console.error(
        "Database query failed for level score by English level:",
        response.error
      );
      return NextResponse.json(
        {
          message: "שגיאה בשאילתת מסד הנתונים עבור ביצועי ציון לפי רמת אנגלית",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(response.result);
  } catch (error) {
    console.error("Error fetching level score by English level:", error);
    return NextResponse.json(
      { message: "שגיאה בלתי צפויה בטעינת ביצועי ציון לפי רמת אנגלית" },
      { status: 500 }
    );
  }
}
