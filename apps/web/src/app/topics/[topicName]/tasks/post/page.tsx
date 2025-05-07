// apps/web/src/app/topics/[topicName]/tasks/post/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FaHeart, FaComment, FaShare, FaInfoCircle } from 'react-icons/fa';
import { getAuthToken } from '../../../../../lib/auth';
import { useAuth } from '../../../../../hooks/useAuth';
import { extractImportantWords, generateTopicWords, createFallbackPost } from '../../../../../utils/topicHelpers';


interface PostData {
  text: string;
  requiredWords: string[];
}

interface FeedbackResult {
  score: number;
  clarityFeedback: string;
  grammarFeedback: string;
  vocabularyFeedback: string;
  contentRelevanceFeedback: string;
  wordUsage: { word: string; used: boolean; context: string }[];
  overallFeedback: string;
}

// Function to generate required words based on topic name
const generateRequiredWords = (topic: string) => {
  const words = generateTopicWords(topic);
  return words.slice(0, 5);
};

export default function PostTask() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const topicName = params?.topicName as string;
  const level = searchParams?.get('level') || '1';
  const taskId = searchParams?.get('taskId');
  
  const [post, setPost] = useState<string>('');
  const [userComment, setUserComment] = useState('');
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiredWords, setRequiredWords] = useState<string[]>([]);
  const [feedbackResults, setFeedbackResults] = useState<FeedbackResult | null>(null);
  const [socialMetrics, setSocialMetrics] = useState({
    likes: Math.floor(Math.random() * 50) + 10,
    comments: 0,
    shares: Math.floor(Math.random() * 10) + 5
  });
  const [isLiked, setIsLiked] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);


  // Authentication check
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

  const pageTitle = `${formatTopicName(topicName)} - Social Post Task`;

  const createPostTask = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        console.error("No authentication token found");
        return null;
      }
  
      console.log(`Creating post task for topic: ${topicName}, level: ${level}`);
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          TopicName: topicName,
          Level: level,
          TaskType: 'post'
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create post task:', errorData);
        return null;
      }
  
      const data = await response.json();
      console.log('Post task created successfully:', data);
      return data.TaskId;
    } catch (error) {
      console.error('Error creating post task:', error);
      return null;
    }
  };

  // Function to extract required words from post content
  const extractRequiredWords = (text: string): string[] => {
    return extractImportantWords(text).slice(0, 5);
  };

  // Generate post content via API
  const generatePostContent = async (token: string) => {
    try {
      console.log('Attempting to generate post content via API');
      
      const generateResponse = await fetch(`/api/create-post/${encodeURIComponent(topicName)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          level: level
        })
      });
      
      if (generateResponse.ok) {
        const data = await generateResponse.json();
        console.log('Successfully generated post content');
        return {
          text: data.text || '',
          requiredWords: data.requiredWords || []
        };
      } else {
        console.error(`Failed to generate post: ${generateResponse.status}`);
        return null;
      }
    } catch (error) {
      console.error('Error generating post:', error);
      return null;
    }
  };

  useEffect(() => {
// Modified fetchPostData function for the PostTask component
const fetchPostData = async () => {
  if (!isAuthenticated || !topicName) return;
  
  const token = getAuthToken();
  if (!token) {
    setError('Authentication required');
    router.push('/login');
    return;
  }
  
  try {
    setIsLoadingPost(true);
    setError(null);
    
    console.log(`Loading post for topic: ${topicName}`);
    
    // Check if we have a taskId. If not, create one
    let currentTaskId = taskId;
    if (!currentTaskId) {
      console.log('No taskId provided, creating new post task');
      currentTaskId = await createPostTask();
      if (!currentTaskId) {
        throw new Error('Failed to create task');
      }
    }
    
    // Try to find existing post directly using the taskId-specific endpoint
    let existingPostData = null;
    let existingPostId = null;
    
    try {
      console.log(`Checking for existing post with taskId: ${currentTaskId}`);
      // Use the new taskId-specific endpoint
      const postsResponse = await fetch(`/api/posts/${encodeURIComponent(currentTaskId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        if (Array.isArray(postsData) && postsData.length > 0) {
          existingPostData = postsData[0];
          existingPostId = existingPostData.PostID;
          console.log(`Found existing post with ID: ${existingPostId}`);
        } else {
          console.log('No existing post found for this task');
        }
      } else {
        console.warn(`Failed to check for existing post: ${postsResponse.status}`);
      }
    } catch (checkError) {
      console.error('Error checking for existing post:', checkError);
    }
    
    // If we found an existing post, use it
    if (existingPostData && existingPostData.PostContent) {
      console.log('Using existing post content');
      setPost(existingPostData.PostContent);
      
      if (existingPostData.Picture) {
        setImageUrl(existingPostData.Picture);
      } else {
        selectTopicImage(topicName);
      }
      
      // Extract or generate required words
      try {
        const extractedWords = extractRequiredWords(existingPostData.PostContent);
        if (extractedWords.length >= 5) {
          setRequiredWords(extractedWords.slice(0, 5));
        } else {
          setRequiredWords(generateRequiredWords(topicName));
        }
      } catch (extractError) {
        console.error('Error extracting words:', extractError);
        setRequiredWords(generateRequiredWords(topicName));
      }
      
      // If we have a post ID, store it for future use
      if (existingPostId) {
        localStorage.setItem(`post_id_${currentTaskId}`, existingPostId);
      }
    } else {
      // Generate post content 
      try {
        const generatedPost = await generatePostContent(token);
        
        if (generatedPost && generatedPost.text) {
          console.log('Using generated post content');
          setPost(generatedPost.text);
          setRequiredWords(generatedPost.requiredWords || generateRequiredWords(topicName));
          selectTopicImage(topicName);
          
          // Always generate a post ID to ensure consistent behavior
          const postId = crypto.randomUUID ? crypto.randomUUID() : `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem(`post_id_${currentTaskId}`, postId);
          console.log(`Generated post ID: ${postId} (saving to database)`);
          
          // Save to the database using the taskId-specific endpoint
          try {
            const saveResponse = await fetch(`/api/posts/${encodeURIComponent(currentTaskId)}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                PostID: postId,
                PostContent: generatedPost.text,
                Picture: imageUrl
              })
            });
            
            if (saveResponse.ok) {
              console.log('Post saved successfully to database');
              // Parse and update post ID if returned
              try {
                const saveResult = await saveResponse.json();
                if (saveResult.PostID) {
                  localStorage.setItem(`post_id_${currentTaskId}`, saveResult.PostID);
                  console.log(`Updated post ID to: ${saveResult.PostID}`);
                }
              } catch (parseError) {
                console.error('Error parsing save response:', parseError);
              }
            } else {
              console.error(`Failed to save post: ${saveResponse.status}`);
              
              // Implement retry logic for critical operation
              console.log('Retrying post save operation...');
              setTimeout(async () => {
                try {
                  const retryResponse = await fetch(`/api/posts/${encodeURIComponent(currentTaskId)}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      PostID: postId,
                      PostContent: generatedPost.text,
                      Picture: imageUrl
                    })
                  });
                  
                  if (retryResponse.ok) {
                    console.log('Post saved successfully on retry');
                  } else {
                    console.error(`Retry failed to save post: ${retryResponse.status}`);
                  }
                } catch (retryError) {
                  console.error('Error in save retry:', retryError);
                }
              }, 2000); // Retry after 2 seconds
            }
          } catch (saveError) {
            console.error('Error saving post to database:', saveError);
          }
        } else {
          throw new Error('Failed to generate post content');
        }
      } catch (err) {
        console.error('Error with post generation:', err);
        
        // Create a fallback post as last resort
        console.log('Using fallback post content');
        const formattedTopic = formatTopicName(topicName);
        const fallbackPost = createFallbackPost(formattedTopic);
        
        setPost(fallbackPost);
        setRequiredWords(generateRequiredWords(topicName));
        selectTopicImage(topicName);
        
        // Create a post ID and save fallback post to database
        const postId = crypto.randomUUID ? crypto.randomUUID() : `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem(`post_id_${currentTaskId}`, postId);
        console.log(`Generated fallback post ID: ${postId} (saving to database)`);
        
        try {
          const saveResponse = await fetch(`/api/posts/${encodeURIComponent(currentTaskId)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              PostID: postId,
              PostContent: fallbackPost,
              Picture: imageUrl
            })
          });
          
          if (saveResponse.ok) {
            console.log('Fallback post saved successfully to database');
          } else {
            console.error(`Failed to save fallback post: ${saveResponse.status}`);
          }
        } catch (saveError) {
          console.error('Error saving fallback post to database:', saveError);
        }
      }
    }
  } catch (err) {
    console.error('Error fetching/creating post:', err);
    setError('Failed to load social post. Please try again later.');
    
    // Create a fallback post even when errors occur
    const formattedTopic = formatTopicName(topicName);
    const fallbackPost = createFallbackPost(formattedTopic);
    
    setPost(fallbackPost);
    setRequiredWords(generateRequiredWords(topicName));
    selectTopicImage(topicName);
    
    // If we have a taskId, save the fallback post
    if (taskId) {
      const postId = crypto.randomUUID ? crypto.randomUUID() : `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(`post_id_${taskId}`, postId);
      
      // Save fallback post to database
      try {
        const token = getAuthToken();
        if (token) {
          const saveResponse = await fetch(`/api/posts/${encodeURIComponent(taskId)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              PostID: postId,
              PostContent: fallbackPost,
              Picture: imageUrl
            })
          });
          
          if (saveResponse.ok) {
            console.log('Emergency fallback post saved successfully to database');
          } else {
            console.error(`Failed to save emergency fallback post: ${saveResponse.status}`);
          }
        }
      } catch (saveError) {
        console.error('Error saving emergency fallback post to database:', saveError);
      }
    }
  } finally {
    setIsLoadingPost(false);
  }
};
  
    fetchPostData();
  }, [isAuthenticated, topicName, taskId, level, router]);

  useEffect(() => {
    if (taskId) {
      // Store start time in session storage
      sessionStorage.setItem(`task_start_${taskId}`, Date.now().toString());
    }
  }, [taskId]);

  // Select an appropriate image for the topic
  const selectTopicImage = (topic: string) => {
    const lowerTopic = topic.toLowerCase();
    let newImageUrl = '';
    
    if (lowerTopic.includes('diplomacy') || lowerTopic.includes('relation')) {
      newImageUrl = 'https://cdn.pixabay.com/photo/2017/08/05/12/08/network-2583270_1280.jpg';
    } else if (lowerTopic.includes('economy') || lowerTopic.includes('entrepreneur')) {
      newImageUrl = 'https://cdn.pixabay.com/photo/2017/09/07/08/54/money-2724241_1280.jpg';
    } else if (lowerTopic.includes('innovation') || lowerTopic.includes('technology')) {
      newImageUrl = 'https://cdn.pixabay.com/photo/2016/11/19/14/00/code-1839406_1280.jpg';
    } else if (lowerTopic.includes('history') || lowerTopic.includes('heritage')) {
      newImageUrl = 'https://cdn.pixabay.com/photo/2018/07/20/14/02/israel-3550699_1280.jpg';
    } else if (lowerTopic.includes('holocaust') || lowerTopic.includes('revival')) {
      newImageUrl = 'https://cdn.pixabay.com/photo/2016/05/15/20/52/jerusalem-1394562_1280.jpg';
    } else if (lowerTopic.includes('iron') || lowerTopic.includes('sword') || lowerTopic.includes('war')) {
      newImageUrl = 'https://cdn.pixabay.com/photo/2016/06/13/07/59/soldier-1453836_1280.jpg';
    } else if (lowerTopic.includes('society') || lowerTopic.includes('culture')) {
      newImageUrl = 'https://cdn.pixabay.com/photo/2020/01/10/11/36/jerusalem-4754666_1280.jpg';
    } else if (lowerTopic.includes('environment') || lowerTopic.includes('sustainability')) {
      newImageUrl = 'https://cdn.pixabay.com/photo/2019/10/20/19/30/nature-4564618_1280.jpg';
    } else {
      // Default image
      newImageUrl = 'https://cdn.pixabay.com/photo/2016/11/14/03/35/tel-aviv-1822624_1280.jpg';
    }
    
    console.log(`Selected image URL for topic "${topic}": ${newImageUrl}`);
    setImageUrl(newImageUrl);
  };

  // Handle like button click
  const handleLikeToggle = () => {
    setIsLiked(!isLiked);
    setSocialMetrics(prev => ({
      ...prev,
      likes: prev.likes + (isLiked ? -1 : 1)
    }));
  };

  // Helper function to extract questions from the post
  const extractQuestionsFromPost = (post: string): string[] => {
    const sentences = post.split(/[.!?]+/).filter(s => s.trim());
    
    // Find sentences that end with question marks or contain question words
    return sentences.filter(sentence => {
      const trimmed = sentence.trim();
      return (
        trimmed.endsWith('?') || 
        /\bwhat\b|\bwhy\b|\bhow\b|\bwhen\b|\bwhere\b|\bwhich\b|\bwho\b|\bcan you\b|\bdo you\b|\bwould you\b/i.test(trimmed)
      );
    });
  };

  // Helper function to extract important terms from a question
  const extractKeyTerms = (question: string): string[] => {
    // Remove common question words and articles
    const cleanedQuestion = question.toLowerCase()
      .replace(/\b(what|why|how|when|where|which|who|is|are|do|does|did|can|could|would|should|the|a|an)\b/g, ' ');
    
    // Split into words and filter out short words and punctuation
    return cleanedQuestion.split(/\s+/)
      .filter(word => word.length > 3 && !/[.,?!;:]/.test(word))
      .map(word => word.trim());
  };

  // Evaluate user comment
  const evaluateComment = (comment: string): FeedbackResult => {
    // Clarity score (0-50 points)
    let clarityScore = 0;
    const sentences = comment.split(/[.!?]+/).filter(s => s.trim());
    const wordCount = comment.split(/\s+/).length;
    
    // Length assessment
    if (wordCount >= 50) clarityScore += 20;
    else if (wordCount >= 30) clarityScore += 15;
    else if (wordCount >= 20) clarityScore += 10;
    else clarityScore += 5;
    
    // Sentence structure assessment
    const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
    if (avgSentenceLength >= 8 && avgSentenceLength <= 15) clarityScore += 20;
    else if (avgSentenceLength >= 5) clarityScore += 10;
    
    // Introduction and conclusion
    const hasIntroduction = sentences.length > 0 && sentences[0].length > 20;
    const hasConclusion = sentences.length > 1 && sentences[sentences.length - 1].length > 20;
    if (hasIntroduction) clarityScore += 5;
    if (hasConclusion) clarityScore += 5;
    
    // Grammar score (0-50 points)
    let grammarScore = 0;
    
    // Basic grammar check (simplified for demo)
    const capitalizedSentences = sentences.filter(s => 
      s.trim().length > 0 && 
      s.trim()[0] === s.trim()[0].toUpperCase()
    ).length;
    
    if (sentences.length > 0) {
      grammarScore += Math.round((capitalizedSentences / sentences.length) * 20);
    }
    
    // Simple punctuation check
    const properPunctuation = comment.match(/[.!?][\s\n]+[A-Z]/g)?.length || 0;
    grammarScore += Math.min(20, properPunctuation * 5);
    
    // Spacing check
    const properSpacing = !comment.match(/[,.!?][a-zA-Z]/);
    if (properSpacing) grammarScore += 10;
    
    // Vocabulary usage score (0-50 points)
    let vocabularyScore = 0;
    const wordUsage = requiredWords.map(word => {
      const regex = new RegExp(word, 'i');
      const used = regex.test(comment);
      
      let context = "";
      if (used) {
        // Extract context around the word
        const matches = comment.match(new RegExp(`.{0,30}${word}.{0,30}`, 'i'));
        context = matches ? `...${matches[0]}...` : "";
        
        // Check if word is used in context (simplified)
        const goodContext = comment.toLowerCase().includes(`${word.toLowerCase()} is`) || 
                           comment.toLowerCase().includes(`the ${word.toLowerCase()}`);
        
        if (goodContext) {
          vocabularyScore += 10;
          context += " (Great context!)";
        } else {
          vocabularyScore += 5;
        }
      }
      
      return { word, used, context };
    });

    // Content relevance score (0-50 points)
    let contentRelevanceScore = 0;
    
    // Extract questions from the post
    const postQuestions = extractQuestionsFromPost(post);
    
    if (postQuestions.length > 0) {
      // Check if the user's comment addresses each question
      const addressedQuestions = postQuestions.filter(question => {
        // Check if the comment addresses the question's key terms
        const keyTerms = extractKeyTerms(question);
        return keyTerms.some(term => 
          comment.toLowerCase().includes(term.toLowerCase())
        );
      });
      
      // Score based on the percentage of questions addressed
      const percentageAddressed = (addressedQuestions.length / postQuestions.length) * 100;
      
      if (percentageAddressed >= 90) contentRelevanceScore += 30;
      else if (percentageAddressed >= 70) contentRelevanceScore += 25;
      else if (percentageAddressed >= 50) contentRelevanceScore += 20;
      else if (percentageAddressed >= 30) contentRelevanceScore += 15;
      else if (percentageAddressed > 0) contentRelevanceScore += 10;
      
      // Check for depth of response (looking for elaboration)
      const hasElaboration = addressedQuestions.some(question => {
        const keyTerms = extractKeyTerms(question);
        return keyTerms.some(term => {
          const termIndex = comment.toLowerCase().indexOf(term.toLowerCase());
          if (termIndex >= 0) {
            // Check if there's significant text after the term (indicating elaboration)
            const textAfterTerm = comment.slice(termIndex + term.length);
            return textAfterTerm.length > 50;
          }
          return false;
        });
      });
      
      if (hasElaboration) contentRelevanceScore += 20;
      else if (addressedQuestions.length > 0) contentRelevanceScore += 10;
    } else {
      // If no questions found, evaluate based on topic relevance
      const topicTerms = requiredWords.concat(formatTopicName(topicName).toLowerCase().split(' '));
      const relevantTermsUsed = topicTerms.filter(term => 
        comment.toLowerCase().includes(term.toLowerCase())
      ).length;
      
      const relevancePercentage = (relevantTermsUsed / topicTerms.length) * 100;
      
      if (relevancePercentage >= 70) contentRelevanceScore += 40;
      else if (relevancePercentage >= 50) contentRelevanceScore += 30;
      else if (relevancePercentage >= 30) contentRelevanceScore += 20;
      else if (relevancePercentage > 0) contentRelevanceScore += 10;
      
      // Check for depth (looking for sentences that contain relevant terms)
      const relevantSentences = sentences.filter(sentence => 
        topicTerms.some(term => sentence.toLowerCase().includes(term.toLowerCase()))
      ).length;
      
      if (relevantSentences >= 3) contentRelevanceScore += 10;
    }
    
    // Calculate total score (now includes content relevance)
    const totalScore = Math.min(200, clarityScore + grammarScore + vocabularyScore + contentRelevanceScore);
    
    // Generate feedback messages
    const clarityFeedback = clarityScore >= 40 
      ? "Excellent! Your message is clear and well-structured."
      : clarityScore >= 25 
      ? "Good job on clarity, but try to improve your structure." 
      : "Try to organize your ideas more clearly.";
      
    const grammarFeedback = grammarScore >= 40 
      ? "Your grammar is excellent!"
      : grammarScore >= 25 
      ? "Your grammar is good, with a few minor issues." 
      : "Pay more attention to grammar and punctuation.";
      
    const vocabularyFeedback = vocabularyScore >= 40 
      ? "Excellent use of the required vocabulary!"
      : vocabularyScore >= 25 
      ? "Good use of vocabulary, but try to use more words in context." 
      : "Try to incorporate more of the required words.";

    const contentRelevanceFeedback = 
      contentRelevanceScore >= 50 
        ? "Excellent! Your response directly addresses the questions asked in the post with thoughtful elaboration."
        : contentRelevanceScore >= 40 
        ? "Good job! Your response addresses most of the questions, but could use more detailed elaboration."
        : contentRelevanceScore >= 30 
        ? "Your response touches on the questions, but could be more directly focused on answering them."
        : contentRelevanceScore >= 20 
        ? "Try to more directly address the specific questions asked in the post."
        : "Your response doesn't seem to address the questions in the post. Make sure to answer what was asked.";
    
    const overallFeedback = 
      totalScore >= 190 
        ? "Outstanding work! Your response is thoughtful, relevant, and well-crafted."
        : totalScore >= 150 
        ? "Great job! Your response shows good understanding and addresses the topic well."
        : totalScore >= 100 
        ? "Good effort! Your response is on topic but could be improved with more direct answers."
        : "Keep practicing! Focus on directly answering the questions in the post.";
    
    return {
      score: totalScore,
      clarityFeedback,
      grammarFeedback,
      vocabularyFeedback,
      contentRelevanceFeedback,
      wordUsage,
      overallFeedback
    };
  };

  // Handle comment submission
// פונקציה מעודכנת לשמירת תגובות ישירות לבסיס הנתונים
// פונקציה סופית ומקיפה לשמירת תגובה ועדכון טאסק
const handleSubmitComment = async () => {
  if (!userComment.trim()) return;
  
  setIsSubmitting(true);
  setError(null);
  
  try {
    console.log('Submitting user comment and updating task...');
    
    // הערכת התגובה
    const evaluation = evaluateComment(userComment);
    
    // קבלת הטוקן
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    try {
      // 1. חישוב משך זמן המשימה
      let durationTask = 0;
      const pageLoadTime = Date.now() - (window.performance?.timing?.navigationStart || Date.now() - 300000);
      durationTask = Math.floor(pageLoadTime / 1000);
      
      const taskStartTime = sessionStorage.getItem(`task_start_${taskId}`);
      if (taskStartTime) {
        durationTask = Math.floor((Date.now() - parseInt(taskStartTime)) / 1000);
      }
      console.log(`Task duration: ${durationTask} seconds`);
      
      // 2. בדיקה אם יש לנו taskId, אם לא - יצירת אחד חדש
      let currentTaskId = taskId;
      
      if (!currentTaskId) {
        console.warn('No taskId found, creating a new task');
        
        try {
          const createTaskResponse = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              TopicName: topicName || 'general', 
              Level: level || '1',
              TaskType: 'post',
              StartDate: new Date(Date.now() - durationTask * 1000).toISOString()
            })
          });
          
          if (createTaskResponse.ok) {
            const taskData = await createTaskResponse.json();
            if (taskData.TaskId) {
              currentTaskId = taskData.TaskId;
              console.log(`Created new task with ID: ${currentTaskId}`);
            } else {
              // אם אין TaskId בתשובה, נשתמש במזהה שגוי
              currentTaskId = crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`;
              console.warn(`Response did not include TaskId, using generated ID: ${currentTaskId}`);
            }
          } else {
            // אם יצירת המשימה נכשלה, נשתמש במזהה מקומי
            currentTaskId = crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`;
            console.error(`Failed to create task, using local ID: ${currentTaskId}`);
          }
        } catch (createTaskError) {
          // אם יש שגיאה, נשתמש במזהה מקומי
          currentTaskId = crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`;
          console.error('Error creating task:', createTaskError);
          console.error(`Using local task ID: ${currentTaskId}`);
        }
      }
      
      console.log(`Using task ID: ${currentTaskId}`);
      
      // 3. יצירת פוסט חדש
      console.log('Creating new post for this task...');
      
      // יצירת מזהה פוסט חדש
      const newPostId = crypto.randomUUID ? crypto.randomUUID() : `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      let finalPostId = newPostId;
      
      try {
        // שמירת הפוסט
        const createPostResponse = await fetch(`/api/posts/${encodeURIComponent(currentTaskId || '')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            PostID: newPostId,
            TaskId: currentTaskId,
            PostContent: post || 'Default post content',
            Picture: imageUrl
          })
        });
        
        if (createPostResponse.ok) {
          try {
            const createResult = await createPostResponse.json();
            if (createResult.PostID) {
              finalPostId = createResult.PostID;
            }
            console.log(`Post created with ID: ${finalPostId}`);
          } catch (parseError) {
            console.error('Error parsing create post response:', parseError);
          }
        } else {
          console.error('Failed to create post via API');
        }
      } catch (createPostError) {
        console.error('Error creating post:', createPostError);
      }
      
      // 4. שמירת התגובה
      console.log(`Saving comment for post ID: ${finalPostId}`);
      
      // יצירת מזהה תגובה
      const commentId = crypto.randomUUID ? crypto.randomUUID() : `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      try {
        // נסה לשמור את התגובה דרך נתיב ה-API
        const commentResponse = await fetch('/api/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            CommentID: commentId,
            PostID: finalPostId,
            commentContent: userComment,
            Feedback: JSON.stringify(evaluation),
            TaskId: currentTaskId // הוספת מזהה המשימה למקרה שצריך ליצור פוסט
          })
        });
        
        if (commentResponse.ok) {
          console.log('Comment saved successfully via API');
        } else {
          console.error('Failed to save comment via API, proceeding anyway');
        }
      } catch (commentError) {
        console.error('Error saving comment:', commentError);
      }
      
      // 5. עדכון הטאסק - ניסיון באמצעות מספר נתיבים שונים
      console.log('Updating task status using multiple approaches...');
      
      // מערך הבטחות לכל ניסיונות העדכון
      const updatePromises = [];
      
      // ניסיון 1: PATCH למזהה ספציפי
      updatePromises.push(
        fetch(`/api/tasks/${currentTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            TaskScore: evaluation.score,
            DurationTask: durationTask,
            CompletionDate: new Date().toISOString()
          })
        }).then(response => {
          if (response.ok) {
            console.log('Task updated successfully via PATCH to /api/tasks/[taskId]');
            return true;
          }
          return false;
        }).catch(error => {
          console.error('Error updating task via PATCH to /api/tasks/[taskId]:', error);
          return false;
        })
      );
      
      // ניסיון 2: PUT לנתיב הכללי
      updatePromises.push(
        fetch('/api/tasks', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            taskId: currentTaskId,
            TaskScore: evaluation.score,
            DurationTask: durationTask,
            CompletionDate: new Date().toISOString()
          })
        }).then(response => {
          if (response.ok) {
            console.log('Task updated successfully via PUT to /api/tasks');
            return true;
          }
          return false;
        }).catch(error => {
          console.error('Error updating task via PUT to /api/tasks:', error);
          return false;
        })
      );
      
      // ניסיון 3: עדכון רק משך הזמן
      updatePromises.push(
        fetch(`/api/tasks/${currentTaskId}/duration`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            duration: durationTask
          })
        }).then(response => {
          if (response.ok) {
            console.log('Task duration updated successfully via PATCH to /api/tasks/[taskId]/duration');
            return true;
          }
          return false;
        }).catch(error => {
          console.error('Error updating task duration:', error);
          return false;
        })
      );
      
      // המתנה לסיום כל ניסיונות העדכון
      const results = await Promise.allSettled(updatePromises);
      
      // בדיקה אם לפחות אחד מהניסיונות הצליח
      const anySuccess = results.some(result => result.status === 'fulfilled' && result.value === true);
      
      if (anySuccess) {
        console.log('Task update succeeded through at least one method');
      } else {
        console.error('All task update attempts failed');
      }
      
      // 6. עדכון ממשק המשתמש עם המשוב (תמיד מבוצע)
      setFeedbackResults(evaluation);
      setSocialMetrics(prev => ({
        ...prev,
        comments: prev.comments + 1
      }));
      
      console.log('Comment submission complete!');
    } catch (apiError) {
      console.error('API error:', apiError);
      
      // עדיין נציג את התוצאות למשתמש גם אם ניסיון השמירה נכשל
      setFeedbackResults(evaluation);
      setSocialMetrics(prev => ({
        ...prev,
        comments: prev.comments + 1
      }));
      
      setError('יש בעיה בשמירת התגובה, אך באפשרותך להמשיך בתהליך הלמידה');
    }
  } catch (err) {
    console.error('Error in handleSubmitComment:', err);
    
    // תמיד נראה לפחות את תוצאות ההערכה
    const evaluation = evaluateComment(userComment);
    setFeedbackResults(evaluation);
    setSocialMetrics(prev => ({
      ...prev,
      comments: prev.comments + 1
    }));
    
    setError('אירעה שגיאה בעת שליחת התגובה, אך הערכת התוכן בוצעה בהצלחה');
  } finally {
    setIsSubmitting(false);
  }
};


  // Navigate to next task
  const navigateToNextTask = async () => {
    if (taskId) {
      try {
        // Store the current task ID for the conversation task to reference
        sessionStorage.setItem(`post_task_${topicName}_${level}`, taskId);
        
        // Get the post ID to pass to the next task
        const postId = localStorage.getItem(`post_id_${taskId}`);
        
        // We don't need to save the post again here, as it was already saved
        // when the user submitted their comment
        
        // Create a new task for the conversation
        const token = getAuthToken();
        if (token) {
          try {
            console.log('Creating conversation task');
            
            const createTaskResponse = await fetch('/api/tasks', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                TopicName: topicName,
                Level: level,
                TaskType: 'conversation',
                StartDate: new Date().toISOString()
              })
            });
            
            if (createTaskResponse.ok) {
              const taskData = await createTaskResponse.json();
              const conversationTaskId = taskData.TaskId;
              console.log('Conversation task created successfully with ID:', conversationTaskId);
              
              // Navigate to conversation task with the new task ID
              router.push(`/topics/${topicName}/tasks/conversation?level=${level}&taskId=${conversationTaskId}&postId=${postId || ''}`);
              return;
            }
          } catch (error) {
            console.error('Error creating conversation task:', error);
            // Continue with navigation without task ID
          }
        }
      } catch (error) {
        console.error('Error in navigateToNextTask:', error);
        // Continue with navigation without extra parameters
      }
    }
    
    // Default navigation if any of the above fails
    router.push(`/topics/${topicName}/tasks/conversation?level=${level}`);
  };

  // Track task start time
  useEffect(() => {
    if (taskId) {
      // Store start time in session storage
      sessionStorage.setItem(`task_start_${taskId}`, Date.now().toString());
    }
  }, [taskId]);

  // Loading state
  if (authLoading || isLoadingPost) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 p-6 flex justify-center items-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl font-medium text-gray-700">Loading post...</p>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 p-6 flex justify-center items-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{error}</h2>
          <p className="text-gray-600 mb-6">We're having trouble loading the post. Let's try a different approach.</p>
          <div className="flex flex-col gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-300"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                // Reset error and use fallback content
                setError(null);
                const formattedTopic = formatTopicName(topicName);
                setPost(createFallbackPost(formattedTopic));
                setRequiredWords(generateRequiredWords(topicName));
                selectTopicImage(topicName);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all duration-300"
            >
              Continue with Example Post
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 p-6 relative" dir="ltr">
      {/* Google Font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Rubik', sans-serif;
        }
      `}</style>

      <h1 className="text-3xl font-bold text-center text-gray-800 mb-6 mt-2">{pageTitle}</h1>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto mt-4">
        {/* Post Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-xl">
              👤
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-bold text-gray-900">Israel Expert</h2>
              <p className="text-gray-600 text-sm font-medium">2 hours ago • 🌍</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            <div className="prose text-gray-800 md:w-3/5">
              <p className="whitespace-pre-line">{post}</p>
            </div>
            <div className="md:w-2/5">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Post Image"
                  className="w-full rounded-lg object-cover h-64"
                  onError={(e) => {
                    e.currentTarget.src = 'https://placehold.co/800x600?text=Israeli+Culture';
                  }}
                />
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-12 text-gray-600">
            <button 
              onClick={handleLikeToggle}
              className="flex items-center space-x-2 hover:text-red-500 transition-colors"
            >
              <FaHeart className={isLiked ? 'text-red-500' : ''} />
              <span className="ml-2">{socialMetrics.likes}</span>
            </button>
            <div className="flex items-center space-x-2">
              <FaComment />
              <span className="ml-2">{socialMetrics.comments}</span>
            </div>
            <button className="flex items-center space-x-2 hover:text-blue-500 transition-colors">
              <FaShare />
              <span className="ml-2">{socialMetrics.shares}</span>
            </button>
          </div>
        </div>
        
        {/* Required Words Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center mb-6">
            <FaInfoCircle className="text-orange-500 mr-3 text-xl" />
            <h3 className="text-xl font-bold text-gray-800">Required Words:</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {requiredWords.map(word => (
              <span key={word} className="px-6 py-3 bg-orange-500 text-white rounded-full text-base font-medium shadow-sm">
                {word}
              </span>
            ))}
          </div>
        </div>
        
        {/* Comment Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!feedbackResults ? (
            <div>
              <h3 className="text-xl font-bold text-gray-800 mb-6">Write a response to this post:</h3>
              <p className="text-gray-600 mb-4">Use the required words in your response. We'll provide feedback on your comment.</p>
              
              <textarea
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder={`Write your response about ${formatTopicName(topicName)} using the required words...`}
                className="w-full p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-32 text-gray-900 mb-4"
                rows={6}
              />
              
              <button
                onClick={handleSubmitComment}
                disabled={isSubmitting || !userComment.trim()}
                className="w-full bg-orange-500 text-white py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Your Response:</h3>
                <p className="text-gray-700 whitespace-pre-line">{userComment}</p>
              </div>
              
              <div className="bg-orange-50 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Feedback:</h3>
                  <div className="text-2xl font-bold text-orange-600">
                    {feedbackResults.score}/200 points
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <h4 className="font-bold text-gray-700">Content relevance:</h4>
                    <p className="text-gray-600">{feedbackResults.contentRelevanceFeedback}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-700">Clarity of message:</h4>
                    <p className="text-gray-600">{feedbackResults.clarityFeedback}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-700">Grammatical accuracy:</h4>
                    <p className="text-gray-600">{feedbackResults.grammarFeedback}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-700">Use of required words:</h4>
                    <p className="text-gray-600">{feedbackResults.vocabularyFeedback}</p>
                    
                    <ul className="mt-2 space-y-2">
                      {feedbackResults.wordUsage.map(({ word, used, context }) => (
                        <li key={word} className="flex items-center">
                          <span className={`mr-2 ${used ? 'text-green-500' : 'text-red-500'}`}>
                            {used ? '✓' : '✗'}
                          </span>
                          <span className="font-medium">{word}:</span>
                          <span className="ml-2 text-gray-500">
                            {used ? context : 'Not found in your response'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="text-center p-4 bg-white rounded-lg">
                  <p className="text-xl font-bold text-orange-600">{feedbackResults.overallFeedback}</p>
                </div>
                
                <div className="mt-6 text-center">
                  <button
                    onClick={navigateToNextTask}
                    className="px-8 py-4 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all duration-300 transform hover:-translate-y-1 shadow-md hover:shadow-lg text-lg"
                  >
                    Continue to Interactive Conversation 🎙️
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}