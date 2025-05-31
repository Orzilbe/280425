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
    const selectedTaskType = searchParams.get("taskType") || "all";

    let query = `
      SELECT
        task.TaskType,
        COUNT(task.TaskId) AS total_tasks,
        SUM(CASE WHEN task.CompletionDate IS NOT NULL THEN 1 ELSE 0 END) AS completed_tasks,
        ROUND(AVG(CASE WHEN task.CompletionDate IS NOT NULL THEN task.TaskScore ELSE NULL END), 1) AS avg_score
      FROM Tasks task
    `;

    const params: any[] = [];

    if (selectedTaskType !== "all") {
      query += ` WHERE task.TaskType = ?`;
      params.push(selectedTaskType);
    }

    query += `
      GROUP BY task.TaskType
      ORDER BY task.TaskType ASC
    `;

    // If a specific task type is selected, the GROUP BY and current query structure will correctly return only that type.
    // No explicit LIMIT 1 is needed here as opposed to topic-popularity by TopicName.

    const response = await executeQuery(
      query,
      params,
      "Fetch task type metrics"
    );

    if (!response.success) {
      console.error(
        "Database query failed for task type metrics:",
        response.error
      );
      return NextResponse.json(
        { message: "שגיאה בשאילתת מסד הנתונים עבור מדדי סוגי משימות" },
        { status: 500 }
      );
    }

    return NextResponse.json(response.result);
  } catch (error) {
    console.error("Error fetching task type metrics:", error);
    return NextResponse.json(
      { message: "שגיאה בלתי צפויה בטעינת מדדי סוגי משימות" },
      { status: 500 }
    );
  }
}
