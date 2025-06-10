// apps/web/src/components/Dashboard.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  PieChart as PieChartIcon,
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

interface TaskTypeMetricData {
  TaskType: string;
  total_tasks: number;
  completed_tasks: number;
  avg_score: number | null; // Explicitly allow null from API
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

// Define the custom tick component for XAxis
const CustomizedAxisTick = (props: any) => {
  const { x, y, payload, textAnchor } = props;
  const label = payload.value;

  if (!label || typeof label !== "string") {
    return null;
  }

  const words = label.split(" ");
  const midPoint = Math.ceil(words.length / 2);

  if (words.length <= 1) {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={18}
          textAnchor={textAnchor || "middle"}
          fill="#555"
          fontSize={14}
        >
          {label}
        </text>
      </g>
    );
  }

  const line1 = words.slice(0, midPoint).join(" ");
  const line2 = words.slice(midPoint).join(" ");

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={10}
        textAnchor={textAnchor || "middle"}
        fill="#555"
        fontSize={14}
      >
        {line1}
      </text>
      <text
        x={0}
        y={0}
        dy={28}
        textAnchor={textAnchor || "middle"}
        fill="#555"
        fontSize={14}
      >
        {line2}
      </text>
    </g>
  );
};

// Interface for distinct task types from the new endpoint
interface DistinctTaskType {
  TaskType: string;
}

// New interface for Level Score Performance Chart
interface LevelScorePerformanceRawData {
  Level: number;
  AgeRange: string;
  avgScore: number | null; // Ensure this is number | null
}

interface LevelScorePerformanceChartData {
  Level: number;
  [ageRange: string]: number | null; // Allow null for scores
}

// New interfaces for Level Score by English Level Chart
interface LevelScoreByEnglishLevelRawData {
  Level: number;
  EnglishLevel: string;
  avgScore: number | null;
}

interface LevelScoreByEnglishLevelChartData {
  Level: number;
  [englishLevel: string]: number | null;
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("30d");

  // New states for topic data and individual filters
  const [allTopicsData, setAllTopicsData] = useState<Array<{
    TopicName: string;
    TopicHe: string;
    total_tasks: number;
    completed_tasks: number;
    avg_score: number;
  }> | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicOptions, setTopicOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [popularityChartTopic, setPopularityChartTopic] = useState("all");
  const [topTopicsTableTopic, setTopTopicsTableTopic] = useState("all");

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

  // State for Task Type Metrics Table (replaces one part of the old topic table functionality)
  const [taskTypeMetricsData, setTaskTypeMetricsData] = useState<
    TaskTypeMetricData[] | null
  >(null);
  const [taskTypeMetricsLoading, setTaskTypeMetricsLoading] = useState(true);
  const [taskTypeMetricOptions, setTaskTypeMetricOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [tableTaskTypeFilter, setTableTaskTypeFilter] = useState("all");

  // State for Level Score Performance Chart
  const [levelScoreData, setLevelScoreData] = useState<
    LevelScorePerformanceRawData[] | null
  >(null);
  const [levelScoreLoading, setLevelScoreLoading] = useState(false); // Default to false, true when fetching
  const [levelScoreChartTaskType, setLevelScoreChartTaskType] = useState(""); // Default to empty, first available type on load

  // State for Level Score by English Level Chart
  const [levelScoreByEnglishLevelData, setLevelScoreByEnglishLevelData] =
    useState<LevelScoreByEnglishLevelRawData[] | null>(null);
  const [levelScoreByEnglishLevelLoading, setLevelScoreByEnglishLevelLoading] =
    useState(false);
  const [
    levelScoreByEnglishLevelChartTaskType,
    setLevelScoreByEnglishLevelChartTaskType,
  ] = useState("");

  // State for the new Topic Metrics Table filter
  const [topicMetricsTableFilter, setTopicMetricsTableFilter] = useState("all");

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
        setLoading(true); // Combined general loading
        setTopicsLoading(true); // Specific loading for topics
        setError(null);

        const token = localStorage.getItem("token");
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        // Fetch all dashboard data in parallel
        const [
          userStatsRes,
          usersByLevelRes,
          allTopicsRes, // Changed to fetch all topics
          completionRatesRes,
          advancedStatsRes,
        ] = await Promise.all([
          fetch("/api/dashboard/user-stats", { headers }),
          fetch("/api/dashboard/users-by-level", { headers }),
          fetch(`/api/dashboard/topic-popularity?topic=all`, { headers }), // Fetch all topics
          fetch("/api/dashboard/completion-rates", { headers }),
          fetch("/api/dashboard/advanced-stats", { headers }),
        ]);

        // Check if all requests were successful
        if (
          !userStatsRes.ok ||
          !usersByLevelRes.ok ||
          !allTopicsRes.ok || // Check allTopicsRes
          !completionRatesRes.ok ||
          !advancedStatsRes.ok
        ) {
          throw new Error("Failed to fetch dashboard data");
        }

        // Parse all responses
        const [
          userStats,
          usersByLevel,
          allTopics, // Changed to allTopics
          completionRates,
          advancedStats,
        ] = await Promise.all([
          userStatsRes.json(),
          usersByLevelRes.json(),
          allTopicsRes.json(), // Parse allTopics
          completionRatesRes.json(),
          advancedStatsRes.json(),
        ]);

        setAllTopicsData(allTopics); // Set all topics data
        const options = [
          { value: "all", label: "כל הנושאים" },
          ...allTopics.map((topic: any) => ({
            value: topic.TopicName,
            label: topic.TopicHe || topic.TopicName,
          })),
        ];
        setTopicOptions(options);
        setTopicsLoading(false); // Topics loaded

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
          completionRates,
          weeklyActivity: advancedStats.weeklyActivity,
          trendForecast: advancedStats.trendForecast,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("שגיאה בטעינת נתוני הדשבורד. אנא נסה שוב מאוחר יותר.");
        setTopicsLoading(false); // Ensure topics loading is false on error
      } finally {
        setLoading(false); // General loading finished
      }
    };

    fetchData();
  }, [isAuthenticated]); // Removed topic-related dependencies here

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

  // Derived data for Topic Popularity Chart
  const filteredPopularityData = useMemo(() => {
    if (!allTopicsData) return [];
    if (popularityChartTopic === "all") return allTopicsData;
    return allTopicsData.filter(
      (topic) => topic.TopicName === popularityChartTopic
    );
  }, [allTopicsData, popularityChartTopic]);

  // Derived data for Top Topics Table
  const filteredTopTopicsData = useMemo(() => {
    if (!allTopicsData) return [];
    let dataToFilter = allTopicsData;
    if (topTopicsTableTopic !== "all") {
      dataToFilter = allTopicsData.filter(
        (topic) => topic.TopicName === topTopicsTableTopic
      );
    }
    return [...dataToFilter].sort((a, b) => b.avg_score - a.avg_score);
  }, [allTopicsData, topTopicsTableTopic]);

  // Fetch Task Type Metrics Data (for the new table)
  const fetchTaskTypeMetrics = async (selectedTaskType: string = "all") => {
    if (!isAuthenticated) return;
    try {
      setTaskTypeMetricsLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(
        `/api/dashboard/tasktype-metrics?taskType=${selectedTaskType}`,
        { headers }
      );
      if (!res.ok) throw new Error("Failed to fetch task type metrics");
      const data: TaskTypeMetricData[] = await res.json();
      setTaskTypeMetricsData(data);

      // If fetching all, update filter options
      if (selectedTaskType === "all") {
        // Deduplicate task types to create options
        const distinctTaskTypes: DistinctTaskType[] =
          await fetchDistinctTaskTypes(token);
        const options = [
          { value: "all", label: "כל סוגי המשימות" },
          ...distinctTaskTypes.map((tt) => ({
            value: tt.TaskType,
            label: tt.TaskType, // Assuming TaskType is user-friendly. Adjust if a different label field is needed.
          })),
        ];
        setTaskTypeMetricOptions(options);
      }
    } catch (err) {
      console.error("Error fetching task type metrics:", err);
      if (!error) {
        // Avoid overwriting general error
        setError("שגיאה בטעינת מדדי סוגי משימות.");
      }
    } finally {
      setTaskTypeMetricsLoading(false);
    }
  };

  // Helper function to fetch distinct task types for the filter
  const fetchDistinctTaskTypes = async (token: string | null) => {
    if (!token) return [];
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // We can reuse the tasktype-metrics endpoint with "all" to get all types,
      // then extract unique types on the client side, or create a dedicated endpoint.
      // For simplicity, let's assume tasktype-metrics?taskType=all returns all types
      // and we can derive distinct types from that response.
      // However, a more robust solution for larger datasets might be a dedicated endpoint.
      // Let's proceed with deriving from the main call for now.
      // The main fetchTaskTypeMetrics when "all" is selected will populate taskTypeMetricsData
      // We will derive options from there in a useMemo or directly in the effect.

      // For now, let's assume the full list comes from the "all" call and options are set there.
      // This helper might be used if we decide to fetch options independently.
      // For this iteration, we will populate options from the `fetchTaskTypeMetrics` when `selectedTaskType === "all"`.
      // To make this explicit, we can fetch all task types from the new endpoint.
      const res = await fetch(`/api/dashboard/tasktype-metrics?taskType=all`, {
        headers,
      });
      if (!res.ok)
        throw new Error("Failed to fetch distinct task types for filter");
      const allTaskTypeData: TaskTypeMetricData[] = await res.json();
      const uniqueTaskTypes = Array.from(
        new Set(allTaskTypeData.map((item) => item.TaskType))
      ).map((taskType) => ({ TaskType: taskType }));
      return uniqueTaskTypes;
    } catch (err) {
      console.error("Error fetching distinct task types for filter:", err);
      return [];
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTaskTypeMetrics(tableTaskTypeFilter);
    }
  }, [isAuthenticated, tableTaskTypeFilter]);

  // Derived data for Task Type Metrics Table
  const filteredTaskTypeMetricsData = useMemo(() => {
    if (!taskTypeMetricsData) return [];
    return [...taskTypeMetricsData].sort((a, b) => {
      // Sort by avg_score descending (nulls last), then by TaskType ascending
      if (a.avg_score === null && b.avg_score === null)
        return a.TaskType.localeCompare(b.TaskType); // Both null, sort by TaskType
      if (a.avg_score === null) return 1; // a (null) comes after b (number)
      if (b.avg_score === null) return -1; // b (null) comes after a (number), so a comes before b
      // Both are numbers, sort by score descending
      if (b.avg_score !== a.avg_score) {
        return b.avg_score - a.avg_score;
      }
      // Scores are equal, sort by TaskType ascending
      return a.TaskType.localeCompare(b.TaskType);
    });
  }, [taskTypeMetricsData]);

  // Derived data for the new Topic Metrics Table
  const filteredTopicMetricsData = useMemo(() => {
    if (!allTopicsData) return [];
    let dataToFilter = allTopicsData;
    if (topicMetricsTableFilter !== "all") {
      dataToFilter = allTopicsData.filter(
        (topic) => topic.TopicName === topicMetricsTableFilter
      );
    }
    // Sort by avg_score descending (nulls/NaNs last), then by TopicName/TopicHe ascending
    return [...dataToFilter].sort((a, b) => {
      const scoreA =
        a.avg_score !== null && !isNaN(parseFloat(String(a.avg_score)))
          ? parseFloat(String(a.avg_score))
          : null;
      const scoreB =
        b.avg_score !== null && !isNaN(parseFloat(String(b.avg_score)))
          ? parseFloat(String(b.avg_score))
          : null;
      const nameA = a.TopicHe || a.TopicName;
      const nameB = b.TopicHe || b.TopicName;

      if (scoreA === null && scoreB === null) return nameA.localeCompare(nameB);
      if (scoreA === null) return 1; // a (null or NaN) comes after b (number)
      if (scoreB === null) return -1; // b (null or NaN) comes after a (number), so a comes before b

      if (scoreB !== scoreA) {
        return scoreB - scoreA; // Sort by score descending
      }
      return nameA.localeCompare(nameB); // Scores are equal, sort by name ascending
    });
  }, [allTopicsData, topicMetricsTableFilter]);

  // Fetch Level Score Performance Data
  const fetchLevelScorePerformanceData = async (taskType: string) => {
    if (!isAuthenticated || !taskType || taskType === "all") {
      setLevelScoreData(null); // Clear data if no specific task type
      return;
    }
    try {
      setLevelScoreLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(
        `/api/dashboard/level-score-performance?taskType=${taskType}`,
        { headers }
      );
      if (!res.ok)
        throw new Error("Failed to fetch level score performance data");
      const data: LevelScorePerformanceRawData[] = await res.json();
      setLevelScoreData(data);
    } catch (err) {
      console.error("Error fetching level score performance data:", err);
      if (!error) {
        setError("שגיאה בטעינת נתוני ביצועי ציון לפי רמה.");
      }
      setLevelScoreData(null); // Clear data on error
    } finally {
      setLevelScoreLoading(false);
    }
  };

  // Effect to fetch level score data when the selected task type changes
  useEffect(() => {
    if (isAuthenticated && levelScoreChartTaskType) {
      fetchLevelScorePerformanceData(levelScoreChartTaskType);
    } else if (
      !levelScoreChartTaskType &&
      taskCompletionData?.taskTypes &&
      taskCompletionData.taskTypes.length > 0
    ) {
      // Set initial task type for the chart if not set and options are available
      const firstTaskType = taskCompletionData.taskTypes.find(
        (tt) => tt.value !== "all"
      );
      if (firstTaskType) {
        setLevelScoreChartTaskType(firstTaskType.value);
      }
    }
  }, [isAuthenticated, levelScoreChartTaskType, taskCompletionData?.taskTypes]);

  // Effect to initialize levelScoreChartTaskType once taskType options are loaded for other charts
  useEffect(() => {
    if (
      !levelScoreChartTaskType &&
      taskCompletionData?.taskTypes &&
      taskCompletionData.taskTypes.length > 0
    ) {
      const firstTaskType = taskCompletionData.taskTypes.find(
        (tt) => tt.value !== "all"
      );
      if (firstTaskType) {
        setLevelScoreChartTaskType(firstTaskType.value);
      } else if (
        taskCompletionData.taskTypes.length > 0 &&
        taskCompletionData.taskTypes[0].value !== "all"
      ) {
        setLevelScoreChartTaskType(taskCompletionData.taskTypes[0].value);
      }
    }
  }, [taskCompletionData?.taskTypes, levelScoreChartTaskType]);

  // Derived data for Level Score Performance Chart (pivot raw data)
  const pivotedLevelScoreData = useMemo(() => {
    if (!levelScoreData || levelScoreData.length === 0) return [];

    const ageRanges = Array.from(
      new Set(levelScoreData.map((d) => d.AgeRange))
    ).sort();
    const levels = Array.from(new Set(levelScoreData.map((d) => d.Level))).sort(
      (a, b) => a - b
    );

    const chartData: LevelScorePerformanceChartData[] = levels.map((level) => {
      const levelRow: LevelScorePerformanceChartData = { Level: level };
      ageRanges.forEach((ageRange) => {
        const entry = levelScoreData.find(
          (d) => d.Level === level && d.AgeRange === ageRange
        );
        levelRow[ageRange] = entry ? entry.avgScore : null; // Assign null for missing data
      });
      return levelRow;
    });
    return chartData;
  }, [levelScoreData]);

  // Fetch Level Score Performance Data by English Level
  const fetchLevelScoreByEnglishLevelData = async (taskType: string) => {
    if (!isAuthenticated || !taskType || taskType === "all") {
      setLevelScoreByEnglishLevelData(null);
      return;
    }
    try {
      setLevelScoreByEnglishLevelLoading(true);
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(
        `/api/dashboard/level-score-by-english-level?taskType=${taskType}`,
        { headers }
      );
      if (!res.ok)
        throw new Error(
          "Failed to fetch level score performance data by English level"
        );
      const data: LevelScoreByEnglishLevelRawData[] = await res.json();
      setLevelScoreByEnglishLevelData(data);
    } catch (err) {
      console.error(
        "Error fetching level score performance data by English level:",
        err
      );
      if (!error) {
        setError("שגיאה בטעינת נתוני ביצועי ציון לפי רמת אנגלית.");
      }
      setLevelScoreByEnglishLevelData(null);
    } finally {
      setLevelScoreByEnglishLevelLoading(false);
    }
  };

  // Effect to fetch level score data by English level when its selected task type changes
  useEffect(() => {
    if (isAuthenticated && levelScoreByEnglishLevelChartTaskType) {
      fetchLevelScoreByEnglishLevelData(levelScoreByEnglishLevelChartTaskType);
    } else if (
      !levelScoreByEnglishLevelChartTaskType &&
      taskCompletionData?.taskTypes &&
      taskCompletionData.taskTypes.length > 0
    ) {
      const firstTaskType = taskCompletionData.taskTypes.find(
        (tt) => tt.value !== "all"
      );
      if (firstTaskType) {
        setLevelScoreByEnglishLevelChartTaskType(firstTaskType.value);
      }
    }
  }, [
    isAuthenticated,
    levelScoreByEnglishLevelChartTaskType,
    taskCompletionData?.taskTypes,
  ]);

  // Effect to initialize levelScoreByEnglishLevelChartTaskType
  useEffect(() => {
    if (
      !levelScoreByEnglishLevelChartTaskType &&
      taskCompletionData?.taskTypes &&
      taskCompletionData.taskTypes.length > 0
    ) {
      const firstTaskType = taskCompletionData.taskTypes.find(
        (tt) => tt.value !== "all"
      );
      if (firstTaskType) {
        setLevelScoreByEnglishLevelChartTaskType(firstTaskType.value);
      } else if (
        taskCompletionData.taskTypes.length > 0 &&
        taskCompletionData.taskTypes[0].value !== "all"
      ) {
        setLevelScoreByEnglishLevelChartTaskType(
          taskCompletionData.taskTypes[0].value
        );
      }
    }
  }, [taskCompletionData?.taskTypes, levelScoreByEnglishLevelChartTaskType]);

  // Derived data for Level Score by English Level Chart
  const pivotedLevelScoreByEnglishLevelData = useMemo(() => {
    if (
      !levelScoreByEnglishLevelData ||
      levelScoreByEnglishLevelData.length === 0
    )
      return [];

    const englishLevels = Array.from(
      new Set(levelScoreByEnglishLevelData.map((d) => d.EnglishLevel))
    ).sort();
    const levels = Array.from(
      new Set(levelScoreByEnglishLevelData.map((d) => d.Level))
    ).sort((a, b) => a - b);

    const chartData: LevelScoreByEnglishLevelChartData[] = levels.map(
      (level) => {
        const levelRow: LevelScoreByEnglishLevelChartData = { Level: level };
        englishLevels.forEach((engLevel) => {
          const entry = levelScoreByEnglishLevelData.find(
            (d) => d.Level === level && d.EnglishLevel === engLevel
          );
          levelRow[engLevel] = entry ? entry.avgScore : null;
        });
        return levelRow;
      }
    );
    return chartData;
  }, [levelScoreByEnglishLevelData]);

  const englishLevelColors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  const ageRangeColors = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff8042",
    "#00C49F",
    "#FFBB28",
  ];

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
              {/* Global Topic select removed from here */}
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
              // change={data.userStats.userGrowth}
              // changeType={
              //   data.userStats.userGrowth >= 0 ? "positive" : "negative"
              // }
            />
            <StatCard
              title="משתמשים פעילים"
              value={data.userStats.activeUsers?.toLocaleString() || "0"}
              icon={Activity}
              // change={data.userStats.activityChange}
              // changeType={
              //   data.userStats.activityChange >= 0 ? "positive" : "negative"
              // }
            />
            <StatCard
              title="משתמשים חדשים החודש"
              value={String(data.userStats.newUsersThisMonth || 0)}
              icon={Calendar}
              // change={data.userStats.newUserGrowth}
              // changeType={
              //   data.userStats.newUserGrowth >= 0 ? "positive" : "negative"
              // }
            />
            <StatCard
              title="שיעור משתמשים פעילים"
              value={
                data.userStats.totalUsers && data.userStats.totalUsers > 0
                  ? `${(
                      (data.userStats.activeUsers / data.userStats.totalUsers) *
                      100
                    ).toFixed(1)}%`
                  : "N/A"
              }
              icon={PieChartIcon}
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
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart
                    margin={{ top: 20, right: 20, bottom: 30, left: 20 }}
                  >
                    <Pie
                      data={data.usersByLevel}
                      cx="50%"
                      cy="60%"
                      labelLine={{ stroke: "#666", strokeWidth: 1 }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({
                        cx,
                        cy,
                        midAngle,
                        outerRadius,
                        name,
                        percent,
                        value,
                      }) => {
                        const RADIAN = Math.PI / 180;
                        // outerRadius is 120 from user change

                        const isTopLabel = midAngle > 60 && midAngle < 120; // Approx top part
                        const isBottomLabel = midAngle > 240 && midAngle < 300; // Approx bottom part
                        // Note: isLeftLabel was removed for now to simplify, dx for left also removed below

                        let effectiveRadius;
                        if (isTopLabel) {
                          effectiveRadius = outerRadius + 35; // Adjusted: was +25, now +35 for a slightly bigger gap
                        } else if (isBottomLabel) {
                          effectiveRadius = outerRadius + 50 + 45; // Max push for bottom
                        } else {
                          // Side labels
                          effectiveRadius = outerRadius + 60; // Adjusted: was +50, now +60 for a bigger gap for side labels
                        }

                        const lx =
                          cx + effectiveRadius * Math.cos(-midAngle * RADIAN);
                        const ly =
                          cy + effectiveRadius * Math.sin(-midAngle * RADIAN);

                        let textAnchorResolved;
                        if (Math.abs(lx - cx) < 10) {
                          // If label x is very close to pie center x (vertical alignment)
                          textAnchorResolved = "middle";
                        } else {
                          textAnchorResolved = lx > cx ? "start" : "end";
                        }

                        let dx = 0;
                        if (isBottomLabel) {
                          // This logic specifically separates the two centermost bottom labels
                          if (Math.abs(lx - cx) < 25) {
                            if (lx < cx) {
                              dx = -25;
                              textAnchorResolved = "end";
                            } else if (lx > cx) {
                              dx = 25;
                              textAnchorResolved = "start";
                            }
                            // If lx is exactly cx (one central bottom label), dx remains 0, textAnchor is middle
                          }
                        }
                        // Removed: else if (isLeftLabel && textAnchorResolved === 'end') { dx = -10; }

                        return (
                          <text
                            x={lx}
                            y={ly}
                            dx={dx}
                            fill="#333"
                            textAnchor={textAnchorResolved}
                            dominantBaseline="central"
                            fontSize={15}
                          >
                            {`${name}: ${(percent * 100).toFixed(
                              0
                            )}% (${value})`}
                          </text>
                        );
                      }}
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
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">פופולריות נושאים</h2>
              <select
                value={popularityChartTopic}
                onChange={(e) => setPopularityChartTopic(e.target.value)}
                className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={topicsLoading}
              >
                {topicOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {topicsLoading ? (
              <div className="h-80 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                <p className="ml-2 text-gray-600">טוען נתוני נושאים...</p>
              </div>
            ) : filteredPopularityData && filteredPopularityData.length > 0 ? (
              <div className="h-80 overflow-x-auto">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={filteredPopularityData.length * 80}
                >
                  <BarChart
                    data={filteredPopularityData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="TopicHe"
                      interval={0}
                      tick={<CustomizedAxisTick />}
                      height={60} // Increased height for two-line labels
                    />
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
            ) : (
              <div className="h-80 flex items-center justify-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  לא נמצאו נתוני פופולריות לנושא שנבחר.
                </p>
              </div>
            )}
          </div>
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
                      formatter={(value: number, name: string) => {
                        const formattedValue =
                          typeof value === "number" ? value.toFixed(1) : "N/A";
                        return [`${formattedValue} (${name})`, "ציון ממוצע"];
                      }}
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

        {/* New Chart: Level Score Performance by Age Range */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              ביצועי ציון לכל שלב לפי קבוצת גיל
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">סוג משימה:</label>
              <select
                value={levelScoreChartTaskType}
                onChange={(e) => setLevelScoreChartTaskType(e.target.value)}
                className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={
                  levelScoreLoading ||
                  !taskCompletionData?.taskTypes ||
                  taskCompletionData.taskTypes.length === 0
                }
              >
                {/* Populate with task types, ensure "all" is not an option here */}
                {taskCompletionData?.taskTypes
                  ?.filter((tt) => tt.value !== "all")
                  .map((taskType) => (
                    <option key={taskType.value} value={taskType.value}>
                      {taskType.label}
                    </option>
                  ))}
                {(!taskCompletionData?.taskTypes ||
                  taskCompletionData.taskTypes.filter(
                    (tt) => tt.value !== "all"
                  ).length === 0) && (
                  <option value="" disabled>
                    טוען סוגי משימות...
                  </option>
                )}
              </select>
              {levelScoreLoading && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
          </div>
          {levelScoreLoading ? (
            <div className="h-80 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <p className="ml-2 text-gray-600">טוען נתוני ביצועים...</p>
            </div>
          ) : pivotedLevelScoreData && pivotedLevelScoreData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={pivotedLevelScoreData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="Level"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    allowDataOverflow
                    tickCount={pivotedLevelScoreData.length}
                    label={{
                      value: "רמה",
                      position: "insideBottom",
                      offset: -15,
                      style: {
                        fill: "#374151",
                        fontSize: "14px",
                        fontWeight: 500,
                      },
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickMargin={35}
                    label={{
                      value: "ציון ממוצע",
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        fill: "#374151",
                        fontSize: "14px",
                        fontWeight: "500",
                      },
                      offset: -5,
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 20 }} />
                  {levelScoreData &&
                    Array.from(new Set(levelScoreData.map((d) => d.AgeRange)))
                      .sort()
                      .map((ageRange, index) => (
                        <Line
                          key={ageRange}
                          type="monotone"
                          dataKey={ageRange}
                          stroke={ageRangeColors[index % ageRangeColors.length]}
                          strokeWidth={2}
                          name={ageRange || "לא ידוע"}
                        />
                      ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">
                {!levelScoreChartTaskType
                  ? "אנא בחר סוג משימה."
                  : `לא נמצאו נתונים עבור סוג משימה: ${levelScoreChartTaskType}.`}
              </p>
            </div>
          )}
        </div>

        {/* New Chart: Level Score Performance by English Level */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              ביצועי ציון לכל שלב לפי רמת אנגלית
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">סוג משימה:</label>
              <select
                value={levelScoreByEnglishLevelChartTaskType}
                onChange={(e) =>
                  setLevelScoreByEnglishLevelChartTaskType(e.target.value)
                }
                className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={
                  levelScoreByEnglishLevelLoading ||
                  !taskCompletionData?.taskTypes ||
                  taskCompletionData.taskTypes.length === 0
                }
              >
                {taskCompletionData?.taskTypes
                  ?.filter((tt) => tt.value !== "all")
                  .map((taskType) => (
                    <option key={taskType.value} value={taskType.value}>
                      {taskType.label}
                    </option>
                  ))}
                {(!taskCompletionData?.taskTypes ||
                  taskCompletionData.taskTypes.filter(
                    (tt) => tt.value !== "all"
                  ).length === 0) && (
                  <option value="" disabled>
                    טוען סוגי משימות...
                  </option>
                )}
              </select>
              {levelScoreByEnglishLevelLoading && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
          </div>
          {levelScoreByEnglishLevelLoading ? (
            <div className="h-80 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <p className="ml-2 text-gray-600">
                טוען נתוני ביצועים לפי רמת אנגלית...
              </p>
            </div>
          ) : pivotedLevelScoreByEnglishLevelData &&
            pivotedLevelScoreByEnglishLevelData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={pivotedLevelScoreByEnglishLevelData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="Level"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    allowDataOverflow
                    tickCount={pivotedLevelScoreByEnglishLevelData.length}
                    label={{
                      value: "רמה",
                      position: "insideBottom",
                      offset: -15,
                      style: {
                        fill: "#374151",
                        fontSize: "14px",
                        fontWeight: 500,
                      },
                    }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickMargin={35}
                    label={{
                      value: "ציון ממוצע",
                      angle: -90,
                      position: "insideLeft",
                      style: {
                        fill: "#374151",
                        fontSize: "14px",
                        fontWeight: "500",
                      },
                      offset: -5,
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 20 }} />
                  {levelScoreByEnglishLevelData &&
                    Array.from(
                      new Set(
                        levelScoreByEnglishLevelData.map((d) => d.EnglishLevel)
                      )
                    )
                      .sort()
                      .map((engLevel, index) => (
                        <Line
                          key={engLevel}
                          type="monotone"
                          dataKey={engLevel}
                          stroke={
                            englishLevelColors[
                              index % englishLevelColors.length
                            ]
                          }
                          strokeWidth={2}
                          name={engLevel || "לא ידוע"}
                        />
                      ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">
                {!levelScoreByEnglishLevelChartTaskType
                  ? "אנא בחר סוג משימה."
                  : `לא נמצאו נתונים עבור סוג משימה: ${levelScoreByEnglishLevelChartTaskType}.`}
              </p>
            </div>
          )}
        </div>

        {/* Task Metrics by Type Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">מדדי משימות לפי סוג</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">
                סנן לפי סוג משימה:
              </label>
              <select
                value={tableTaskTypeFilter}
                onChange={(e) => setTableTaskTypeFilter(e.target.value)}
                className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={
                  taskTypeMetricsLoading || taskTypeMetricOptions.length === 0
                }
              >
                {taskTypeMetricOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {taskTypeMetricOptions.length === 0 &&
                  !taskTypeMetricsLoading && (
                    <option value="" disabled>
                      אין סוגי משימות זמינים
                    </option>
                  )}
              </select>
              {taskTypeMetricsLoading && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
          </div>

          {taskTypeMetricsLoading ? (
            <div className="h-60 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-gray-600">טוען מדדי סוגי משימות...</p>
              </div>
            </div>
          ) : filteredTaskTypeMetricsData &&
            filteredTaskTypeMetricsData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 shadow-sm border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      סוג משימה
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      סה"כ משימות (הותחלו)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      משימות שהושלמו
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ציון ממוצע (הושלמו)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTaskTypeMetricsData.map((item, index) => (
                    <tr
                      key={item.TaskType + index}
                      className={
                        index % 2 === 0
                          ? "bg-white hover:bg-gray-50"
                          : "bg-gray-50 hover:bg-gray-100"
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.TaskType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.total_tasks.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.completed_tasks.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.avg_score !== null ? (
                          (() => {
                            const numericScore = parseFloat(
                              String(item.avg_score)
                            );
                            if (isNaN(numericScore)) {
                              return <span className="text-gray-400">N/A</span>; // Display N/A if parsing fails
                            }
                            return (
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  numericScore >= 80
                                    ? "bg-green-100 text-green-800"
                                    : numericScore >= 70
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {numericScore.toFixed(1)}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  {tableTaskTypeFilter === "all"
                    ? "לא נמצאו נתונים עבור סוגי משימות."
                    : `לא נמצאו נתונים עבור סוג המשימה: ${tableTaskTypeFilter}.`}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  נסה לבחור סוג משימה אחר או לרענן.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Topic Performance Metrics Table */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">מדדי ביצועים לפי נושא</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">סנן לפי נושא:</label>
              <select
                value={topicMetricsTableFilter}
                onChange={(e) => setTopicMetricsTableFilter(e.target.value)}
                className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={topicsLoading || topicOptions.length === 0}
              >
                {topicOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                {topicOptions.length === 0 && !topicsLoading && (
                  <option value="" disabled>
                    אין נושאים זמינים
                  </option>
                )}
              </select>
              {topicsLoading && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
              )}
            </div>
          </div>

          {topicsLoading ? (
            <div className="h-60 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-gray-600">טוען מדדי נושאים...</p>
              </div>
            </div>
          ) : filteredTopicMetricsData &&
            filteredTopicMetricsData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 shadow-sm border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      נושא
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      סה"כ משימות (הותחלו)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      משימות שהושלמו
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ציון ממוצע (הושלמו)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTopicMetricsData.map((item, index) => (
                    <tr
                      key={(item.TopicName || "topic") + index}
                      className={
                        index % 2 === 0
                          ? "bg-white hover:bg-gray-50"
                          : "bg-gray-50 hover:bg-gray-100"
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.TopicHe || item.TopicName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.total_tasks.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.completed_tasks.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.avg_score !== null ? (
                          (() => {
                            const numericScore = parseFloat(
                              String(item.avg_score)
                            );
                            if (isNaN(numericScore)) {
                              return <span className="text-gray-400">N/A</span>;
                            }
                            return (
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  numericScore >= 80
                                    ? "bg-green-100 text-green-800"
                                    : numericScore >= 70
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {numericScore.toFixed(1)}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  {topicMetricsTableFilter === "all"
                    ? "לא נמצאו נתוני ביצועים לנושאים."
                    : `לא נמצאו נתוני ביצועים עבור הנושא: ${
                        topicOptions.find(
                          (opt) => opt.value === topicMetricsTableFilter
                        )?.label || topicMetricsTableFilter
                      }.`}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  נסה לבחור נושא אחר או לרענן.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
