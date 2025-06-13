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
      return NextResponse.json([]);
    }

    const query = `
      SELECT
        t.Level,
        u.AgeRange,
        ROUND(AVG(t.DurationTask), 1) as avgDuration
      FROM Tasks t
      JOIN Users u ON t.UserId = u.UserId
      WHERE t.TaskType = ? AND t.CompletionDate IS NOT NULL AND u.AgeRange IS NOT NULL AND t.DurationTask IS NOT NULL
      GROUP BY t.Level, u.AgeRange
      ORDER BY t.Level ASC, u.AgeRange ASC;
    `;

    const params = [taskType];

    const response = await executeQuery(
      query,
      params,
      "Fetch level duration performance"
    );

    if (!response.success) {
      console.error(
        "Database query failed for level duration performance:",
        response.error
      );
      return NextResponse.json(
        { message: "שגיאה בשאילתת מסד הנתונים עבור ביצועי משך משימה לפי רמה" },
        { status: 500 }
      );
    }

    return NextResponse.json(response.result);
  } catch (error) {
    console.error("Error fetching level duration performance:", error);
    return NextResponse.json(
      { message: "שגיאה בלתי צפויה בטעינת ביצועי משך משימה לפי רמה" },
      { status: 500 }
    );
  }
}
