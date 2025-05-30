// apps/web/src/components/Dashboard.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Activity,
  BookOpen,
  TrendingUp,
  Calendar,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Download,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  averageScore: number;
  userGrowth: number;
  activityChange: number;
  newUserGrowth: number;
  scoreChange: number;
}

interface TaskCompletionTimeData {
  ageRange: string;
  avgDurationMinutes: number;
  taskCount: number;
  userCount: number;
}

interface TaskAverageScoreData {
  ageRange: string;
  avgScore: number;
  taskCount: number;
  userCount: number;
}

interface TaskTypeOption {
  value: string;
  label: string;
  count: number;
}

interface EnglishLevelOption {
  value: string;
  label: string;
  count: number;
}

interface DashboardData {
  userStats: UserStats;
  usersByLevel: Array<{ name: string; value: number; users: number }>;
  topicPopularity: Array<{
    TopicName: string;
    TopicHe: string;
    total_tasks: number;
    completed_tasks: number;
    avg_score: number;
  }>;
  completionRates: Array<{ name: string; rate: number; color: string }>;
  weeklyActivity: Array<{
    day_name: string;
    activities: number;
    avg_score: number;
  }>;
  trendForecast: Array<{
    activity_date: string;
    daily_activities: number;
    unique_users: number;
  }>;
  taskCompletionTime?: {
    data: TaskCompletionTimeData[];
    taskTypes: TaskTypeOption[];
    englishLevels: EnglishLevelOption[];
    selectedTaskType: string;
    selectedEnglishLevel: string;
  };
}

// קומפוננטה לכרטיס סטטיסטיקה
const StatCard = ({
  title,
  value,
  icon: Icon,
  change,
  changeType,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  change?: number;
  changeType?: string;
}) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <Icon className="h-6 w-6 text-blue-500" />
    </div>
    <div className="flex items-baseline">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {change !== undefined && changeType !== undefined && (
        <p
          className={`ml-2 text-sm font-medium ${
            changeType === "positive" ? "text-green-600" : "text-red-600"
          }`}
        >
          {changeType === "positive" ? "+" : ""}
          {change}%
        </p>
      )}
    </div>
  </div>
);

// קומפוננטת שגיאה
const ErrorMessage = ({ message }: { message: string }) => (
  <div
    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
    role="alert"
  >
    <div className="flex items-center">
      <AlertCircle className="h-5 w-5 mr-2" />
      <span>{message}</span>
    </div>
  </div>
);

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [timeRange, setTimeRange] = useState("30d");

  // State for User Activity Chart (now independent)
  const [userActivityData, setUserActivityData] = useState<Array<{
    date: string;
    activities: number;
    active_users: number;
  }> | null>(null);
  const [userActivityLoading, setUserActivityLoading] = useState(true);

  // Separate state for task completion chart
  const [taskCompletionData, setTaskCompletionData] = useState<{
    data: TaskCompletionTimeData[];
    taskTypes: TaskTypeOption[];
    englishLevels: EnglishLevelOption[];
    selectedTaskType: string;
    selectedEnglishLevel: string;
  } | null>(null);
  const [taskCompletionLoading, setTaskCompletionLoading] = useState(false);
  const [chartTaskType, setChartTaskType] = useState("all");
  const [chartEnglishLevel, setChartEnglishLevel] = useState("all");

  // Separate state for task average score chart
  const [taskAverageScoreData, setTaskAverageScoreData] = useState<{
    data: TaskAverageScoreData[];
    taskTypes: TaskTypeOption[];
    englishLevels: EnglishLevelOption[];
    selectedTaskType: string;
    selectedEnglishLevel: string;
  } | null>(null);
  const [taskAverageScoreLoading, setTaskAverageScoreLoading] = useState(false);
  const [scoreChartTaskType, setScoreChartTaskType] = useState("all");
  const [scoreChartEnglishLevel, setScoreChartEnglishLevel] = useState("all");

  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      }
      // הסרנו את הבדיקה לאדמין - כעת כל משתמש יכול לגשת
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthenticated) return;

      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // Fetch all dashboard data in parallel (excluding task completion time)
        const [
          userStatsRes,
          usersByLevelRes,
          topicPopularityRes,
          completionRatesRes,
          advancedStatsRes,
        ] = await Promise.all([
          fetch("/api/dashboard/user-stats", { headers }),
          fetch("/api/dashboard/users-by-level", { headers }),
          fetch(`/api/dashboard/topic-popularity?topic=${selectedTopic}`, {
            headers,
          }),
          fetch("/api/dashboard/completion-rates", { headers }),
          fetch("/api/dashboard/advanced-stats", { headers }),
        ]);

        // Check if all requests were successful
        if (
          !userStatsRes.ok ||
          !usersByLevelRes.ok ||
          !topicPopularityRes.ok ||
          !completionRatesRes.ok ||
          !advancedStatsRes.ok
        ) {
          throw new Error("Failed to fetch dashboard data");
        }

        // Parse all responses
        const [
          userStats,
          usersByLevel,
          topicPopularity,
          completionRates,
          advancedStats,
        ] = await Promise.all([
          userStatsRes.json(),
          usersByLevelRes.json(),
          topicPopularityRes.json(),
          completionRatesRes.json(),
          advancedStatsRes.json(),
        ]);

        // עדכון נתוני השינוי מ-advancedStats
        const updatedUserStats = {
          ...userStats,
          userGrowth: advancedStats.userGrowth,
          activityChange: advancedStats.activityChange,
          scoreChange: advancedStats.scoreChange,
        };

        setData({
          userStats: updatedUserStats,
          usersByLevel,
          topicPopularity,
          completionRates,
          weeklyActivity: advancedStats.weeklyActivity,
          trendForecast: advancedStats.trendForecast,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("שגיאה בטעינת נתוני הדשבורד. אנא נסה שוב מאוחר יותר.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, selectedTopic]);

  // Fetch User Activity Data (now independent)
  const fetchUserActivityData = async (currentRange: string) => {
    if (!isAuthenticated) return;
    try {
      setUserActivityLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(
        `/api/dashboard/user-activity?range=${currentRange}`,
        { headers }
      );
      if (!res.ok) throw new Error("Failed to fetch user activity");
      const data = await res.json();
      setUserActivityData(data);
    } catch (err) {
      console.error("Error fetching user activity data:", err);
      // Avoid overwriting general error with user activity specific error if one already exists
      if (!error) {
        setError("שגיאה בטעינת נתוני פעילות משתמשים.");
      }
    } finally {
      setUserActivityLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserActivityData(timeRange);
    }
  }, [isAuthenticated, timeRange]);

  // Separate function for task completion data
  const fetchTaskCompletionData = async (
    taskType: string,
    englishLevel: string = "all"
  ) => {
    if (!isAuthenticated) return;

    try {
      setTaskCompletionLoading(true);

      const token = localStorage.getItem("token");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(
        `/api/dashboard/task-completion-time?taskType=${taskType}&englishLevel=${englishLevel}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch task completion data");
      }

      const taskCompletionTime = await response.json();
      setTaskCompletionData(taskCompletionTime);
    } catch (error) {
      console.error("Error fetching task completion data:", error);
      setError("שגיאה בטעינת נתוני זמן השלמת המשימות.");
    } finally {
      setTaskCompletionLoading(false);
    }
  };

  // Load task completion data on mount and when filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchTaskCompletionData(chartTaskType, chartEnglishLevel);
    }
  }, [isAuthenticated, chartTaskType, chartEnglishLevel]);

  // Handle chart task type change
  const handleChartTaskTypeChange = (newTaskType: string) => {
    setChartTaskType(newTaskType);
  };

  // Handle chart English level change
  const handleChartEnglishLevelChange = (newEnglishLevel: string) => {
    setChartEnglishLevel(newEnglishLevel);
  };

  // Separate function for task average score data
  const fetchTaskAverageScoreData = async (
    taskType: string,
    englishLevel: string = "all"
  ) => {
    if (!isAuthenticated) return;

    try {
      setTaskAverageScoreLoading(true);

      const token = localStorage.getItem("token");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(
        `/api/dashboard/task-average-score?taskType=${taskType}&englishLevel=${englishLevel}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch task average score data");
      }

      const taskAverageScore = await response.json();
      setTaskAverageScoreData(taskAverageScore);
    } catch (error) {
      console.error("Error fetching task average score data:", error);
      setError("שגיאה בטעינת נתוני ציוני המשימות.");
    } finally {
      setTaskAverageScoreLoading(false);
    }
  };

  // Load task average score data on mount and when filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchTaskAverageScoreData(scoreChartTaskType, scoreChartEnglishLevel);
    }
  }, [isAuthenticated, scoreChartTaskType, scoreChartEnglishLevel]);

  // Handle score chart task type change
  const handleScoreChartTaskTypeChange = (newTaskType: string) => {
    setScoreChartTaskType(newTaskType);
  };

  // Handle score chart English level change
  const handleScoreChartEnglishLevelChange = (newEnglishLevel: string) => {
    setScoreChartEnglishLevel(newEnglishLevel);
  };

  // פונקציה לייצוא נתונים
  const handleExport = async (format: "json" | "csv") => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(`/api/dashboard/export?format=${format}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      if (format === "csv") {
        // הורדת קובץ CSV
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dashboard-export-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // הורדת קובץ JSON
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dashboard-export-${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      setError("שגיאה בייצוא הנתונים. אנא נסה שוב.");
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8B5CF6"];

  return (
    <div className="min-h-screen bg-gray-100 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* כותרת ופילטרים */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              דשבורד ניתוח משתמשים
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              ניתוח מקיף של פעילות המשתמשים במערכת
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <Link
              href="/topics"
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-300"
            >
              חזור לעמוד הראשי
            </Link>
          </div>
        </div>

        {/* פילטרים וכפתורי ייצוא */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex gap-4">
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">כל הנושאים</option>
                <option value="Diplomacy and International Relations">
                  Diplomacy and International Relations
                </option>
                <option value="Economy and Entrepreneurship">
                  Economy and Entrepreneurship
                </option>
                <option value="Environment and Sustainability">
                  Environment and Sustainability
                </option>
                <option value="History and Heritage">
                  History and Heritage
                </option>
                <option value="Holocaust and Revival">
                  Holocaust and Revival
                </option>
                <option value="Innovation and Technology">
                  Innovation and Technology
                </option>
                <option value="Iron Swords War">Iron Swords War</option>
                <option value="Science and Technology">
                  Science and Technology
                </option>
                <option value="Society and Multiculturalism">
                  Society and Multiculturalism
                </option>
              </select>
            </div>

            {/* כפתורי ייצוא */}
            <div className="flex gap-2">
              <button
                onClick={() => handleExport("json")}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-300 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                ייצוא JSON
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-300 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                ייצוא CSV
              </button>
            </div>
          </div>
        </div>

        {/* כרטיסי סטטיסטיקות כלליות */}
        {data?.userStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="סה״כ משתמשים"
              value={data.userStats.totalUsers?.toLocaleString() || "0"}
              icon={Users}
            />
            <StatCard
              title="משתמשים פעילים"
              value={data.userStats.activeUsers?.toLocaleString() || "0"}
              icon={Activity}
            />
            <StatCard
              title="משתמשים חדשים החודש"
              value={String(data.userStats.newUsersThisMonth || 0)}
              icon={Calendar}
            />
          </div>
        )}

        {/* גרפים ראשונים */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* הפלגת משתמשים לפי רמה */}
          {data?.usersByLevel && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">
                הפלגת משתמשים לפי רמה
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.usersByLevel}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({
                        name,
                        value,
                      }: {
                        name: string;
                        value: number;
                      }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.usersByLevel.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* פופולריות נושאים */}
          {data?.topicPopularity && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">פופולריות נושאים</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topicPopularity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="TopicHe" />
                    <YAxis tickMargin={20} />
                    <Tooltip
                      formatter={(value, name) => [
                        value,
                        name === "total_tasks" ? "משימות" : "השלמות",
                      ]}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "total_tasks" ? "משימות" : "השלמות"
                      }
                    />
                    <Bar dataKey="total_tasks" fill="#8884d8" />
                    <Bar dataKey="completed_tasks" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* פעילות לאורך זמן */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">פעילות משתמשים לאורך זמן</h2>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">7 ימים</option>
              <option value="30d">30 ימים</option>
              <option value="90d">90 ימים</option>
              <option value="1y">שנה</option>
            </select>
          </div>
          {userActivityLoading ? (
            <div className="h-80 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <p className="ml-2 text-gray-600">טוען נתוני פעילות...</p>
            </div>
          ) : userActivityData && userActivityData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickMargin={20} />
                  <Tooltip />
                  <Legend
                    formatter={(value) =>
                      value === "activities" ? "פעילויות" : "משתמשים פעילים"
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="activities"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="active_users"
                    stroke="#82ca9d"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">
                אין נתוני פעילות להצגה עבור טווח הזמן שנבחר.
              </p>
            </div>
          )}
        </div>

        {/* זמן השלמת משימות */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              זמן השלמת משימות ממוצע לפי רמת אנגלית וטווח גילאים
            </h2>

            {/* Filter for this chart only */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600">רמת אנגלית:</label>
              <select
                value={chartEnglishLevel}
                onChange={(e) => handleChartEnglishLevelChange(e.target.value)}
                className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={taskCompletionLoading}
              >
                <option value="all">כל הרמות</option>
                {taskCompletionData?.englishLevels?.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>

              <label className="text-sm text-gray-600">סוג משימה:</label>
              <select
                value={chartTaskType}
                onChange={(e) => handleChartTaskTypeChange(e.target.value)}
                className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={taskCompletionLoading}
              >
                <option value="all">כל סוגי המשימות</option>
                {taskCompletionData?.taskTypes?.map((taskType) => (
                  <option key={taskType.value} value={taskType.value}>
                    {taskType.label}
                  </option>
                ))}
              </select>
              {taskCompletionLoading && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
          </div>

          {taskCompletionLoading ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-gray-700 font-medium text-lg">
                  טוען נתוני זמני השלמה...
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  אנא המתן בזמן שאנו מעבדים את הנתונים
                </p>
              </div>
            </div>
          ) : taskCompletionData?.data && taskCompletionData.data.length > 0 ? (
            <>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={taskCompletionData.data}
                    margin={{ top: 50, right: 40, left: 80, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="ageRange"
                      angle={0}
                      textAnchor="end"
                      height={50}
                      interval={0}
                      tick={{
                        fontSize: 14,
                        fill: "#374151",
                        fontWeight: 500,
                      }}
                      axisLine={{ stroke: "#374151", strokeWidth: 1 }}
                      tickLine={{ stroke: "#374151", strokeWidth: 1 }}
                      tickMargin={10}
                    />
                    <YAxis
                      label={{
                        value: "זמן בדקות",
                        angle: -90,
                        position: "outside",
                        offset: -60,
                        dx: -20,
                        style: {
                          textAnchor: "middle",
                          fill: "#374151",
                          fontSize: "14px",
                          fontWeight: 500,
                        },
                      }}
                      tick={{
                        fontSize: 14,
                        fill: "#374151",
                        fontWeight: 500,
                      }}
                      axisLine={{ stroke: "#374151", strokeWidth: 1 }}
                      tickLine={{ stroke: "#374151", strokeWidth: 1 }}
                      tickMargin={30}
                      width={80}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)} דקות`,
                        "זמן ממוצע",
                      ]}
                      labelFormatter={(label: string) =>
                        `טווח גילאים: ${label}`
                      }
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    />

                    <Bar
                      dataKey="avgDurationMinutes"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                      stroke="#1d4ed8"
                      strokeWidth={1}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* טבלת מידע נוסף */}
              <div className="mt-8 overflow-x-auto">
                <h3 className="text-md font-semibold text-gray-800 mb-4">
                  פירוט נתונים
                </h3>
                <table className="min-w-full divide-y divide-gray-200 shadow-sm border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        טווח גילאים
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        זמן ממוצע (דקות)
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        מספר משימות
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        מספר משתמשים
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taskCompletionData.data.map((item, index) => (
                      <tr
                        key={index}
                        className={
                          index % 2 === 0
                            ? "bg-white hover:bg-gray-50"
                            : "bg-gray-50 hover:bg-gray-100"
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {item.ageRange}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <span
                            className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                              item.avgDurationMinutes <= 2
                                ? "bg-green-100 text-green-800"
                                : item.avgDurationMinutes <= 5
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.avgDurationMinutes.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                          {item.taskCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                          {item.userCount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="h-[500px] flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 text-xl mb-2 font-semibold">
                  אין נתונים זמינים
                </p>
                <p className="text-gray-500 text-base max-w-md mx-auto">
                  {chartTaskType === "all" && chartEnglishLevel === "all"
                    ? "לא נמצאו משימות שהושלמו עם נתוני זמן"
                    : `לא נמצאו משימות${
                        chartTaskType !== "all" ? ` מסוג ${chartTaskType}` : ""
                      }${
                        chartEnglishLevel !== "all"
                          ? ` לרמת אנגלית ${chartEnglishLevel}`
                          : ""
                      } שהושלמו עם נתוני זמן`}
                </p>
                <p className="text-gray-400 text-sm mt-3">
                  נסה לשנות את הפילטרים או לחזור מאוחר יותר
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ציון ממוצע למשימות */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              ציון ממוצע למשימות לפי רמת אנגלית וטווח גילאים
            </h2>

            {/* Filter for this chart only */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600">רמת אנגלית:</label>
              <select
                value={scoreChartEnglishLevel}
                onChange={(e) =>
                  handleScoreChartEnglishLevelChange(e.target.value)
                }
                className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={taskAverageScoreLoading}
              >
                <option value="all">כל הרמות</option>
                {taskAverageScoreData?.englishLevels?.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>

              <label className="text-sm text-gray-600">סוג משימה:</label>
              <select
                value={scoreChartTaskType}
                onChange={(e) => handleScoreChartTaskTypeChange(e.target.value)}
                className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={taskAverageScoreLoading}
              >
                <option value="all">כל סוגי המשימות</option>
                {taskAverageScoreData?.taskTypes?.map((taskType) => (
                  <option key={taskType.value} value={taskType.value}>
                    {taskType.label}
                  </option>
                ))}
              </select>
              {taskAverageScoreLoading && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
          </div>

          {taskAverageScoreLoading ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-gray-700 font-medium text-lg">
                  טוען נתוני ציוני משימות...
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  אנא המתן בזמן שאנו מעבדים את הנתונים
                </p>
              </div>
            </div>
          ) : taskAverageScoreData?.data &&
            taskAverageScoreData.data.length > 0 ? (
            <>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={taskAverageScoreData.data}
                    margin={{ top: 50, right: 40, left: 80, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="ageRange"
                      angle={0}
                      textAnchor="end"
                      height={50}
                      interval={0}
                      tick={{
                        fontSize: 14,
                        fill: "#374151",
                        fontWeight: 500,
                      }}
                      axisLine={{ stroke: "#374151", strokeWidth: 1 }}
                      tickLine={{ stroke: "#374151", strokeWidth: 1 }}
                      tickMargin={10}
                    />
                    <YAxis
                      label={{
                        value: "ציון ממוצע",
                        angle: -90,
                        position: "outside",
                        offset: -60,
                        dx: -30,
                        style: {
                          textAnchor: "middle",
                          fill: "#374151",
                          fontSize: "14px",
                          fontWeight: 500,
                        },
                      }}
                      tick={{
                        fontSize: 14,
                        fill: "#374151",
                        fontWeight: 500,
                      }}
                      axisLine={{ stroke: "#374151", strokeWidth: 1 }}
                      tickLine={{ stroke: "#374151", strokeWidth: 1 }}
                      tickMargin={45}
                      width={80}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)} נקודות`,
                        "ציון ממוצע",
                      ]}
                      labelFormatter={(label: string) =>
                        `טווח גילאים: ${label}`
                      }
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    />
                    <Bar
                      dataKey="avgScore"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      stroke="#059669"
                      strokeWidth={1}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* טבלת מידע נוסף */}
              <div className="mt-8 overflow-x-auto">
                <h3 className="text-md font-semibold text-gray-800 mb-4">
                  פירוט נתונים
                </h3>
                <table className="min-w-full divide-y divide-gray-200 shadow-sm border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        טווח גילאים
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        ציון ממוצע
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        מספר משימות
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        מספר משתמשים
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taskAverageScoreData.data.map((item, index) => (
                      <tr
                        key={index}
                        className={
                          index % 2 === 0
                            ? "bg-white hover:bg-gray-50"
                            : "bg-gray-50 hover:bg-gray-100"
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {item.ageRange}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <span
                            className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                              item.avgScore >= 80
                                ? "bg-green-100 text-green-800"
                                : item.avgScore >= 70
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.avgScore.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                          {item.taskCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                          {item.userCount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="h-[500px] flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 text-xl mb-2 font-semibold">
                  אין נתונים זמינים
                </p>
                <p className="text-gray-500 text-base max-w-md mx-auto">
                  {scoreChartTaskType === "all" &&
                  scoreChartEnglishLevel === "all"
                    ? "לא נמצאו משימות שהושלמו עם ציונים"
                    : `לא נמצאו משימות${
                        scoreChartTaskType !== "all"
                          ? ` מסוג ${scoreChartTaskType}`
                          : ""
                      }${
                        scoreChartEnglishLevel !== "all"
                          ? ` לרמת אנגלית ${scoreChartEnglishLevel}`
                          : ""
                      } שהושלמו עם ציונים`}
                </p>
                <p className="text-gray-400 text-sm mt-3">
                  נסה לשנות את הפילטרים או לחזור מאוחר יותר
                </p>
              </div>
            </div>
          )}
        </div>

        {/* פעילות שבועית */}
        {/* {data?.weeklyActivity && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">פעילות שבועית</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day_name" />
                  <YAxis />
                  <Tooltip />
                  <Legend
                    formatter={(value) =>
                      value === "activities" ? "פעילויות" : "ציון ממוצע"
                    }
                  />
                  <Bar dataKey="activities" fill="#8884d8" />
                  <Bar dataKey="avg_score" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )} */}

        {/* שיעור השלמה */}
        {data?.completionRates && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">
              שיעור השלמה לפי סוג פעילות
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.completionRates.map((item, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="relative w-24 h-24 mb-2">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#E5E7EB"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${
                          2 * Math.PI * 40 * (1 - item.rate / 100)
                        }`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                      {item.rate}%
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-700">
                    {item.name}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* רשימת נושאים מובילים */}
        {data?.topicPopularity && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">
              נושאים מובילים לפי ציון ממוצע
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      נושא
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      משימות
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      השלמות
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ציון ממוצע
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.topicPopularity
                    .sort((a, b) => b.avg_score - a.avg_score)
                    .map((topic, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {topic.TopicHe || topic.TopicName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {topic.total_tasks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {topic.completed_tasks}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              topic.avg_score >= 80
                                ? "bg-green-100 text-green-800"
                                : topic.avg_score >= 70
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {typeof topic.avg_score === "number"
                              ? topic.avg_score.toFixed(1)
                              : "0"}{" "}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* גרף מגמות תחזית */}
        {/* {data?.trendForecast && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">מגמות פעילות - 30 ימים אחרונים</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trendForecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="activity_date" />
                  <YAxis />
                  <Tooltip />
                  <Legend formatter={(value) => value === 'daily_activities' ? 'פעילויות יומיות' : 'משתמשים ייחודיים'} />
                  <Line 
                    type="monotone" 
                    dataKey="daily_activities" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="unique_users" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default Dashboard;
