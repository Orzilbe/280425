//apps/web/src/app/topics/[topicName]/tasks/quiz/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaStar, FaTrophy, FaStopwatch } from 'react-icons/fa';
import { getAuthToken } from '../../../../../lib/auth';
import { useAuth } from '../../../../../hooks/useAuth';
import { formatTopicNameForDb, formatTopicNameForUrl, areTopicNamesEquivalent } from '../../../../lib/topicUtils';
interface QuizQuestion {
  id: string;
  word: string;
  correctAnswer: string;
  options: string[];
}

export default function QuizTask() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const topicName = params?.topicName as string;
  const level = searchParams?.get('level') || '1';
  const taskId = searchParams?.get('taskId');
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState<{ word: string, translation: string }[]>([]);
  const [incorrectAnswers, setIncorrectAnswers] = useState<{ word: string, translation: string, userAnswer: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [words, setWords] = useState<any[]>([]);

  // בדיקת אימות
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Format the topic name for display
  const formatTopicName = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const pageTitle = `${formatTopicName(topicName)} Quiz - Level ${level}`;

  // Generate mock quiz questions based on a task ID
  useEffect(() => {
    const generateQuizQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.group('Generating Quiz Questions');
        console.log('Original topicName from URL:', topicName);
        
        // Ensure consistent topic name formats
        const urlTopicName = topicName; // Keep the original for URL navigation
        const dbTopicName = formatTopicNameForDb(topicName);
        
        console.log('Formatted topic names - URL:', urlTopicName, 'DB:', dbTopicName);
        
        const token = getAuthToken();
        if (!token) {
          throw new Error('Authentication token missing');
        }
        
        // First try to get words from the task if we have a taskId
        let taskWords = [];
        if (taskId) {
          try {
            console.log(`Attempting to fetch words associated with flashcard task ${taskId}`);
            const taskWordsResponse = await fetch(`/api/words-in-task?taskId=${encodeURIComponent(taskId)}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (taskWordsResponse.ok) {
              const taskWordsData = await taskWordsResponse.json();
              if (taskWordsData.success && Array.isArray(taskWordsData.data)) {
                taskWords = taskWordsData.data;
                console.log(`Retrieved ${taskWords.length} words from task ${taskId}`);
              } else {
                console.warn('Task words endpoint returned success, but no data array');
              }
            } else {
              console.warn(`Could not fetch task words: ${taskWordsResponse.status}`);
            }
          } catch (taskWordsError) {
            console.error('Error fetching task words:', taskWordsError);
          }
        }
        
        // If we couldn't get words from the task, try both formats of topic name
        if (taskWords.length === 0) {
          console.log('No task words found, fetching from topic instead');
          
          // Try with DB format (spaces and capital letters)
          const dbFormatResponse = await fetch(`/api/words?topic=${encodeURIComponent(dbTopicName)}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (dbFormatResponse.ok) {
            const dbWords = await dbFormatResponse.json();
            if (Array.isArray(dbWords) && dbWords.length > 0) {
              console.log(`Retrieved ${dbWords.length} words using DB format topic name`);
              taskWords = dbWords;
            }
          }
          
          // If still no words, try URL format (hyphens and lowercase)
          if (taskWords.length === 0) {
            console.log('No words found with DB format, trying URL format');
            const urlFormatResponse = await fetch(`/api/words?topic=${encodeURIComponent(urlTopicName)}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (urlFormatResponse.ok) {
              const urlWords = await urlFormatResponse.json();
              if (Array.isArray(urlWords) && urlWords.length > 0) {
                console.log(`Retrieved ${urlWords.length} words using URL format topic name`);
                taskWords = urlWords;
              }
            }
          }
        }
        
        // If we still have no words, throw an error
        if (taskWords.length === 0) {
          throw new Error('No words found for this topic. Please complete flashcard learning first.');
        }
        
        // Validate word structure to ensure they have the required fields
        const validWords = taskWords.filter((word: any) => 
          word && 
          word.Word && 
          word.Translation && 
          (word.WordId || word.wordId)
        );
        
        if (validWords.length === 0) {
          throw new Error('No valid words found with required fields.');
        }
        
        console.log(`${validWords.length} valid words available for quiz`);
        
        // Normalize word structure (some might have different casing for fields)
        const normalizedWords = validWords.map((word: any) => ({
          id: word.WordId || word.wordId,
          word: word.Word,
          correctAnswer: word.Translation,
          topicName: word.TopicName || word.topicName || dbTopicName
        }));
        
        // Transform words into quiz questions
        const questions = normalizedWords.map((word: any) => {
          // Generate 3 random incorrect options
          const incorrectOptions = generateIncorrectOptions(word.correctAnswer, normalizedWords);
          
          // Combine correct answer with incorrect options and shuffle
          const options = [word.correctAnswer, ...incorrectOptions].sort(() => Math.random() - 0.5);
          
          console.log(`Generated options for word "${word.word}":`, options);
          
          return {
            id: word.id,
            word: word.word,
            correctAnswer: word.correctAnswer,
            options
          };
        });
        
        // Shuffle questions
        const shuffledQuestions = questions.sort(() => Math.random() - 0.5);
        
        // Use all available questions instead of limiting to 5
        const quizQuestions = shuffledQuestions;
        console.log(`Generated ${quizQuestions.length} quiz questions`);
        
        // Debug log the final questions with their options
        console.log("Final quiz questions:", quizQuestions.map((q: any) => ({
          word: q.word,
          correctAnswer: q.correctAnswer,
          optionsCount: q.options.length,
          options: q.options
        })));
        
        setQuizQuestions(quizQuestions);
        console.groupEnd();
      } catch (err) {
        console.error('Error generating quiz questions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
        console.groupEnd();
      } finally {
        setIsLoading(false);
      }
    };
    
    generateQuizQuestions();
  }, [topicName, level, taskId]);
  
  // Generate incorrect options for a quiz question
  const generateIncorrectOptions = (correctAnswer: string, allWords: any[]) => {
    // Filter out the word with the correct answer
    const otherWords = allWords.filter(word => word.correctAnswer !== correctAnswer);
    
    // Shuffle the other words
    const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
    
    // Take the first 3 translations as incorrect options
    const incorrectOptions = shuffled.slice(0, 3).map(word => word.correctAnswer);
    
    // If we don't have enough incorrect options, add some mock options
    while (incorrectOptions.length < 3) {
      incorrectOptions.push(`אפשרות ${incorrectOptions.length + 1}`);
    }
    
    console.log("Generated incorrect options:", incorrectOptions);
    return incorrectOptions;
  };
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && quizQuestions.length > 0) {
      interval = setInterval(() => setTimer((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, quizQuestions]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateQuestionScore = (timeSpent: number, currentStreak: number) => {
    // Base score for correct answer: 20 points
    let questionScore = 20;

    // Time bonus: Up to 5 extra points for quick answers (under 10 seconds)
    const timeBonus = Math.max(0, 5 - Math.floor(timeSpent / 2));
    questionScore += timeBonus;

    // Streak bonus: Up to 5 extra points for maintaining a streak
    const streakBonus = Math.min(5, currentStreak);
    questionScore += streakBonus;

    return questionScore;
  };

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
  };

  const handleSubmit = () => {
    if (!quizQuestions || quizQuestions.length === 0 || currentQuestion >= quizQuestions.length) {
      return;
    }
    
    const isCorrect = selectedAnswer === quizQuestions[currentQuestion].correctAnswer;
    
    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      // Calculate time spent on this question (assuming timer is in seconds)
      const timePerQuestion = timer / (currentQuestion + 1);
      
      // Calculate score for this question
      const questionScore = calculateQuestionScore(timePerQuestion, newStreak);
      setScore(prev => prev + questionScore);
      
      // Add to correct answers
      setCorrectAnswers(prev => [...prev, { 
        word: quizQuestions[currentQuestion].word, 
        translation: quizQuestions[currentQuestion].correctAnswer 
      }]);
    } else {
      setStreak(0);
      
      // Add to incorrect answers
      setIncorrectAnswers(prev => [...prev, { 
        word: quizQuestions[currentQuestion].word, 
        translation: quizQuestions[currentQuestion].correctAnswer, 
        userAnswer: selectedAnswer 
      }]);
    }
    
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer('');
    } else {
      setIsTimerActive(false);
      
      // Final score adjustments
      setScore(prev => {
        // Time completion bonus: Up to 30 extra points for completing quickly
        const timeCompletionBonus = Math.max(0, 30 - Math.floor(timer / 20));
        
        // Perfect streak bonus: 20 extra points for all correct answers
        const perfectStreakBonus = streak === quizQuestions.length ? 20 : 0;
        
        // Cap total score at 200
        return Math.min(200, prev + timeCompletionBonus + perfectStreakBonus);
      });
      
      // Complete the quiz task in the backend
      completeQuizTask();
      
      setShowResultModal(true);
    }
  };
  
  // Modified completeQuizTask function for QuizTask component
const completeQuizTask = async () => {
  try {
    console.group('Completing Quiz Task');
    console.log('Current taskId:', taskId);
    console.log('Current score:', score);
    console.log('Time spent:', timer, 'seconds');
    
    if (!taskId) {
      console.warn('No taskId available, cannot complete task');
      console.groupEnd();
      return;
    }
    
    // Skip API calls for client-side temporary IDs
    if (taskId.startsWith('client_')) {
      console.log(`Using temporary task ID ${taskId}, skipping server update`);
      console.groupEnd();
      return;
    }
    
    const token = getAuthToken();
    if (!token) {
      console.error('No authentication token available');
      console.groupEnd();
      return;
    }
    
    // Using the correct API endpoint as implemented in your codebase
    // Your API expects PUT /api/tasks with taskId in the body, not in the URL
    const response = await fetch('/api/tasks', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        taskId: taskId,
        TaskScore: score,
        DurationTask: timer,
        CompletionDate: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to complete quiz task (${response.status}):`, errorText);
    } else {
      const result = await response.json();
      console.log('Successfully completed quiz task:', result);
    }
    
    console.groupEnd();
  } catch (error) {
    console.error('Error completing quiz task:', error);
    console.groupEnd();
  }
};

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer('');
    setScore(0);
    setStreak(0);
    setTimer(0);
    setIsTimerActive(true);
    setShowResultModal(false);
    setCorrectAnswers([]);
    setIncorrectAnswers([]);
  };
  
  // Start post task
  const startPost = () => {
    // If score is less than 60%, don't allow proceeding
    if (score < (quizQuestions.length * 0.6)) {
      return;
    }
    
    const postTaskParams = new URLSearchParams();
    postTaskParams.append('level', level);
    
    if (taskId) {
      postTaskParams.append('taskId', taskId);
    }
    
    router.push(`/topics/${topicName}/tasks/post?${postTaskParams.toString()}`);
  };

  const fetchWords = async () => {
    try {
      console.log('Attempting to fetch words from backend API...');
      const response = await fetch(`/api/words?topic=${encodeURIComponent(topicName)}&learned=true`);
      
      if (!response.ok) {
        console.log('Backend API returned status ' + response.status + ', proceeding to next source');
        throw new Error('Failed to fetch words');
      }
      
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log(`Retrieved ${data.length} words from backend API`);
        setWords(data);
        return;
      }
      
      console.log('No words found in backend API');
    } catch (error) {
      console.error('Error fetching words:', error);
    }
  };

  // Navigate to next task
  const navigateToNextTask = () => {
    if (score < (quizQuestions.length * 0.6)) {
      // Score is too low - highlight the Try Again button instead
      const tryAgainBtn = document.getElementById('try-again-btn');
      if (tryAgainBtn) {
        tryAgainBtn.classList.add('animate-pulse', 'ring-4', 'ring-green-300');
        setTimeout(() => {
          tryAgainBtn.classList.remove('animate-pulse', 'ring-4', 'ring-green-300');
        }, 2000);
      }
      return;
    }
    
    // Store quiz information for the post task
    if (taskId) {
      sessionStorage.setItem(`quiz_task_${topicName}_${level}`, taskId);
      
      try {
        // Also store the correctly answered words
        const correctWordsList = correctAnswers.map(a => a.word);
        sessionStorage.setItem(`quiz_words_${topicName}_${level}`, JSON.stringify(correctWordsList));
      } catch (error) {
        console.error('Error storing quiz words:', error);
      }
    }
    
    // Create post task URL
    const postTaskParams = new URLSearchParams();
    postTaskParams.append('level', level);
    
    // Add task ID if we have one
    if (taskId) {
      postTaskParams.append('quizTaskId', taskId);
    }
    
    router.push(`/topics/${topicName}/tasks/post?${postTaskParams.toString()}`);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 p-6 flex justify-center items-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <div className="inline-block w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl font-medium text-gray-700">Loading Quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 flex justify-center items-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{error}</h2>
          <p className="text-gray-600 mb-6">Please complete the flashcard exercise first to learn some words.</p>
          <div className="flex flex-col gap-4">
            <Link 
              href={`/topics/${topicName}/tasks/flashcard?level=${level}`}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-300"
            >
              Go to Flashcards
            </Link>
            <Link 
              href="#" 
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300"
            >
              Back to Topics
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (quizQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 flex justify-center items-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="text-orange-500 text-5xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Quiz Questions Available</h2>
          <p className="text-gray-600 mb-6">Please complete the flashcard exercise first to learn some words.</p>
          <div className="flex flex-col gap-4">
            <Link 
              href={`/topics/${topicName}/tasks/flashcard?level=${level}`}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-300"
            >
              Go to Flashcards
            </Link>
            <Link 
              href="#" 
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300"
            >
              Back to Topics
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Removed toggleProfile function

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 p-6 relative" dir="rtl">
      {/* Google Font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Rubik', sans-serif;
        }
      `}</style>

      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6 mt-2">{pageTitle}</h1>

      {/* Profile Icon - Removed */}

      {/* Stats Header */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 shadow-lg mb-6">
        <div className="flex justify-between items-center">
          <div className="text-center transform hover:scale-110 transition-all duration-300">
            <FaStar className="text-yellow-500 text-3xl mb-2 mx-auto" />
            <div className="text-3xl font-bold text-orange-500 mb-1">{score}</div>
            <div className="text-sm text-gray-600">ניקוד</div>
          </div>
          <div className="text-center transform hover:scale-110 transition-all duration-300">
            <FaTrophy className="text-orange-500 text-3xl mb-2 mx-auto" />
            <div className="text-3xl font-bold text-orange-500 mb-1">{streak}</div>
            <div className="text-sm text-gray-600">רצף</div>
          </div>
          <div className="text-center transform hover:scale-110 transition-all duration-300">
            <FaStopwatch className="text-blue-500 text-3xl mb-2 mx-auto" />
            <div className="text-3xl font-bold text-orange-500 mb-1">{formatTime(timer)}</div>
            <div className="text-sm text-gray-600">זמן</div>
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <main className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        {/* Quiz info banner */}
        <div className="bg-orange-50 p-4 rounded-xl mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-700">
              בחן את עצמך על המילים שלמדת
            </h2>
          </div>
          <div className="text-orange-600 font-semibold">
            {quizQuestions.length} שאלות
          </div>
        </div>
        
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-6">
          שאלה {currentQuestion + 1} מתוך {quizQuestions.length}
        </h2>
        <p className="text-xl text-gray-700 mb-8">
          בחר את התרגום הנכון למילה: <span className="font-bold text-2xl text-orange-600">{quizQuestions[currentQuestion].word}</span>
        </p>
        <div className="w-full max-w-3xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quizQuestions[currentQuestion]?.options.map((option: string, index: number) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                className={`p-6 rounded-xl text-lg font-semibold transition-all duration-300 ${
                  selectedAnswer === option 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white transform scale-105' 
                  : 'bg-white text-gray-700 border-2 border-orange-200 hover:border-orange-400 hover:scale-105'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer}
          className="mt-8 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl text-lg font-semibold
                   hover:from-orange-600 hover:to-red-600 transition-all duration-300
                   disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
        >
          שלח תשובה
        </button>
      </main>

      {/* Results Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-6">
              תוצאות המבחן! 🎉
            </h2>
            <div className="bg-orange-50 rounded-xl p-6 mb-8">
              <p className="text-2xl text-gray-800 font-semibold mb-2">
                הניקוד שלך: <span className="text-orange-600">{score}</span> נקודות
              </p>
              <p className="text-xl text-gray-700 mb-1">
                תשובות נכונות: <span className="text-green-600 font-bold">{correctAnswers.length}</span> מתוך {quizQuestions.length} ({Math.round((correctAnswers.length / quizQuestions.length) * 100)}%)
              </p>
              <p className="text-gray-600 mt-2">זמן שחלף: {formatTime(timer)}</p>
              
              {/* Passing criteria explanation */}
              {(correctAnswers.length / quizQuestions.length) < 0.6 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <p className="text-red-700 font-medium">
                    לא ניתן להמשיך למשימה הבאה עם ציון נמוך מ-60%.
                  </p>
                  <p className="text-red-600 text-sm">
                    אתה צריך לענות נכון על לפחות {Math.ceil(quizQuestions.length * 0.6)} שאלות מתוך {quizQuestions.length} כדי להמשיך.
                  </p>
                </div>
              )}
            </div>
            
            {/* Results breakdown: Correct and Incorrect Answers */}
            <div className="mt-6 space-y-6">
              {/* Correct Answers Section */}
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="text-lg font-medium text-green-800 mb-3">תשובות נכונות ({correctAnswers.length})</h3>
                {correctAnswers.length > 0 ? (
                  <ul className="space-y-2">
                    {correctAnswers.map((answer, idx) => (
                      <li key={`correct-${idx}`} className="flex justify-between items-center bg-white px-4 py-2 rounded-lg shadow-sm">
                        <span className="font-medium">{answer.word}</span>
                        <span className="text-green-600">{answer.translation}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-center py-2">אין תשובות נכונות.</p>
                )}
              </div>

              {/* Incorrect Answers Section */}
              <div className="bg-red-50 rounded-xl p-4">
                <h3 className="text-lg font-medium text-red-800 mb-3">תשובות שגויות ({incorrectAnswers.length})</h3>
                {incorrectAnswers.length > 0 ? (
                  <ul className="space-y-2">
                    {incorrectAnswers.map((answer, idx) => (
                      <li key={`incorrect-${idx}`} className="flex flex-col bg-white px-4 py-3 rounded-lg shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{answer.word}</span>
                          <span className="text-red-600 line-through">{answer.userAnswer}</span>
                        </div>
                        <div className="text-right text-sm mt-1">
                          <span className="text-gray-500">התשובה הנכונה: </span>
                          <span className="text-green-600 font-medium">{answer.translation}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-center py-2">אין תשובות שגויות!</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <button
                id="try-again-btn"
                onClick={restartQuiz}
                className="w-full py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-300 transform hover:-translate-y-1 shadow-md hover:shadow-xl"
              >
                נסה שוב 🔄
              </button>
              
              {/* Only enable "Next Challenge" if score is at least 60% */}
              <button
                onClick={navigateToNextTask}
                disabled={(correctAnswers.length / quizQuestions.length) < 0.6}
                className={`w-full py-3 ${
                  (correctAnswers.length / quizQuestions.length) >= 0.6
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-gray-400 cursor-not-allowed'
                } text-white rounded-xl transition-all duration-300 transform hover:-translate-y-1 shadow-md hover:shadow-xl`}
              >
                האתגר הבא 🎯
              </button>
              
              {/* Passing score message below Next Challenge button */}
              {(correctAnswers.length / quizQuestions.length) < 0.6 && (
                <p className="text-red-600 text-sm mt-2">
                  נדרש לפחות 60% תשובות נכונות כדי להמשיך לאתגר הבא
                </p>
              )}
            </div>
          </div>
        </div>
      )}



    </div>
  );
}