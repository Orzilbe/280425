// apps/web/src/app/hall-of-fame/page.tsx
'use client';

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

interface TopUser {
  UserId: string;
  FirstName: string;
  LastName: string;
  Score: number;
  ProfilePicture?: string;
  UserRank: number; // שינוי מ-Rank ל-UserRank
}

export default function HallOfFame() {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  // Fetch top users when component mounts
  useEffect(() => {
    const fetchTopUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/top-users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch top users');
        }
        
        const data = await response.json();
        console.log('Top users data:', data); // בדוק את המבנה של הנתונים
        setTopUsers(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching top users:', error);
        setError('Failed to load the Hall of Fame. Please try again later.');
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchTopUsers();
    }
  }, [isAuthenticated]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading state
  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 p-6">
      {/* Google Font Import */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Poppins', sans-serif;
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Hall of Fame
          </h1>
          <p className="text-lg text-gray-600">
            Our top learners with the highest scores
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 text-center">
            {error}
          </div>
        )}

        {/* Top Users Podium - for top 3 */}
        {topUsers.length > 0 && (
          <div className="flex justify-center items-end mb-16 h-64 px-4">
            {/* 2nd Place */}
            {topUsers.length >= 2 && (
              <div className="mx-4 flex flex-col items-center">
                <div className="relative">
                  {topUsers[1].ProfilePicture ? (
                    <img 
                      src={topUsers[1].ProfilePicture} 
                      alt={`${topUsers[1].FirstName} ${topUsers[1].LastName}`} 
                      className="w-16 h-16 rounded-full object-cover border-4 border-gray-300"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-2xl">
                      {topUsers[1].FirstName.charAt(0)}
                    </div>
                  )}
                  <div className="absolute -top-5 -right-2 bg-gray-300 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold">
                    2
                  </div>
                </div>
                <div className="h-32 w-24 bg-gray-300 rounded-t-lg mt-4 flex flex-col items-center justify-center p-2">
                  <p className="font-semibold text-center text-sm truncate w-full">
                    {topUsers[1].FirstName} {topUsers[1].LastName}
                  </p>
                  <p className="text-lg font-bold text-gray-700">{topUsers[1].Score}</p>
                </div>
              </div>
            )}

            {/* 1st Place - Taller */}
            {topUsers.length >= 1 && (
              <div className="mx-4 flex flex-col items-center">
                <div className="relative">
                  {topUsers[0].ProfilePicture ? (
                    <img 
                      src={topUsers[0].ProfilePicture} 
                      alt={`${topUsers[0].FirstName} ${topUsers[0].LastName}`} 
                      className="w-20 h-20 rounded-full object-cover border-4 border-yellow-400"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-yellow-400 flex items-center justify-center text-3xl">
                      {topUsers[0].FirstName.charAt(0)}
                    </div>
                  )}
                  <div className="absolute -top-5 -right-2 bg-yellow-500 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold">
                    1
                  </div>
                </div>
                <div className="h-48 w-32 bg-yellow-400 rounded-t-lg mt-4 flex flex-col items-center justify-center p-2">
                  <p className="font-semibold text-center text-lg truncate w-full">
                    {topUsers[0].FirstName} {topUsers[0].LastName}
                  </p>
                  <p className="text-2xl font-bold text-yellow-800">{topUsers[0].Score}</p>
                  <div className="mt-2">
                    <span className="text-4xl">👑</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {topUsers.length >= 3 && (
              <div className="mx-4 flex flex-col items-center">
                <div className="relative">
                  {topUsers[2].ProfilePicture ? (
                    <img 
                      src={topUsers[2].ProfilePicture} 
                      alt={`${topUsers[2].FirstName} ${topUsers[2].LastName}`} 
                      className="w-14 h-14 rounded-full object-cover border-4 border-amber-700"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-amber-700 flex items-center justify-center text-xl">
                      {topUsers[2].FirstName.charAt(0)}
                    </div>
                  )}
                  <div className="absolute -top-5 -right-2 bg-amber-700 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold">
                    3
                  </div>
                </div>
                <div className="h-24 w-20 bg-amber-700 rounded-t-lg mt-4 flex flex-col items-center justify-center p-2">
                  <p className="font-semibold text-center text-xs truncate w-full text-white">
                    {topUsers[2].FirstName} {topUsers[2].LastName}
                  </p>
                  <p className="text-base font-bold text-amber-200">{topUsers[2].Score}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4th and 5th place - Table view */}
        {topUsers.length > 3 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
            <table className="w-full">
              <thead className="bg-orange-100">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Rank</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">User</th>
                  <th className="py-3 px-4 text-right text-sm font-semibold text-gray-700">Score</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.slice(3).map((user) => (
                  <tr key={user.UserId} className="border-t border-gray-200">
                    <td className="py-4 px-4 flex items-center">
                      <span className="bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center font-bold text-gray-700">
                        {user.UserRank} {/* שינוי מ-Rank ל-UserRank */}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        {user.ProfilePicture ? (
                          <img 
                            src={user.ProfilePicture} 
                            alt={`${user.FirstName} ${user.LastName}`} 
                            className="w-10 h-10 rounded-full object-cover mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                            {user.FirstName.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium">{user.FirstName} {user.LastName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-gray-800">{user.Score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <Link 
            href="/topics" 
            className="px-6 py-3 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-300 text-orange-600 font-medium"
          >
            Back to Topics
          </Link>
        </div>
      </div>
    </div>
  );
}