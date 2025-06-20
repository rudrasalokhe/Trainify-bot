import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquarePlus, Send, MessageSquare, Trash2, Download, Copy, Upload, 
  Plus, Sparkles, Settings, RefreshCw, BookOpen, Star, Cpu, Menu, X, 
  ChevronDown, ChevronRight, Check, Languages, FileText, Bot, User as UserIcon,
  AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { SignedIn, SignedOut, SignIn, UserButton, useAuth } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'prism-react-renderer';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    preview?: string;
  };
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  language?: string;
  modelType?: 'standard' | 'advanced';
}

interface DeleteConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ onConfirm, onCancel, message }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="absolute right-0 top-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 z-10 border border-gray-200 dark:border-gray-700 w-64"
  >
    <p className="text-sm mb-3 dark:text-gray-100">{message}</p>
    <div className="flex gap-2 justify-end">
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
      >
        Delete
      </button>
    </div>
  </motion.div>
);

const languages = [
  { value: 'Chinese', label: '中文' },
  { value: 'English', label: 'English' },
  { value: 'Spanish', label: 'Español' },
  { value: 'French', label: 'Français' },
  { value: 'German', label: 'Deutsch' },
  { value: 'Japanese', label: '日本語' },
  { value: 'Korean', label: '한국어' },
  { value: 'Russian', label: 'Русский' },
  { value: 'Arabic', label: 'العربية' },
  { value: 'Portuguese', label: 'Português' },
  { value: 'Italian', label: 'Italiano' },
];

const API_BASE_URL = 'https://trainify-bot.onrender.com';

const LoadingDots = () => (
  <div className="flex space-x-2">
    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
    <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
    <span>{message}</span>
  </div>
);

const FilePreview = ({ fileInfo }: { fileInfo: Message['fileInfo'] }) => {
  if (!fileInfo) return null;

  const getFileIcon = () => {
    if (fileInfo.type.includes('pdf')) return '📄';
    if (fileInfo.type.includes('word')) return '📝';
    if (fileInfo.type.includes('excel')) return '📊';
    if (fileInfo.type.includes('powerpoint')) return '📑';
    if (fileInfo.type.includes('image')) return '🖼️';
    return '📁';
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{getFileIcon()}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileInfo.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {(fileInfo.size / 1024).toFixed(1)} KB • {fileInfo.type}
          </p>
        </div>
      </div>
      {fileInfo.preview && (
        <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded text-xs whitespace-pre-wrap overflow-auto max-h-40">
          {fileInfo.preview}
        </div>
      )}
    </div>
  );
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              language={match[1]}
              PreTag="div"
              className="rounded-md text-sm my-2"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm font-mono">
              {children}
            </code>
          );
        },
        a({ node, children, ...props }) {
          return (
            <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props}>
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

function App() {
  const { getToken, isLoaded } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'chat' | 'message' } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });
  const [favoriteChats, setFavoriteChats] = useState<string[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [isHoveringSend, setIsHoveringSend] = useState(false);
  const [isHoveringNewChat, setIsHoveringNewChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load data from localStorage
  useEffect(() => {
    if (!isLoaded) return;

    try {
      const savedChats = localStorage.getItem('trainify-chats');
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        parsedChats.forEach((chat: Chat) => {
          chat.createdAt = new Date(chat.createdAt);
          chat.messages.forEach((msg: Message) => {
            msg.timestamp = new Date(msg.timestamp);
          });
        });
        setChats(parsedChats);
      }

      const savedFavorites = localStorage.getItem('trainify-favorites');
      if (savedFavorites) {
        setFavoriteChats(JSON.parse(savedFavorites));
      }
    } catch (e) {
      console.error('Error parsing saved data:', e);
      setError('Failed to load saved conversations. Please refresh the page.');
    }

    const handleResize = () => {
      setShowSidebar(window.innerWidth > 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isLoaded]);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('trainify-chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('trainify-favorites', JSON.stringify(favoriteChats));
  }, [favoriteChats]);

  // Apply dark mode class to body
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      language: 'English',
      modelType: 'standard'
    };
    setChats([newChat, ...chats]);
    setCurrentChat(newChat);
    setShowMobileMenu(false);
    setError(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const renameChat = (chatId: string, newTitle: string) => {
    const updatedChats = chats.map(chat => 
      chat.id === chatId ? { ...chat, title: newTitle } : chat
    );
    setChats(updatedChats);
    if (currentChat?.id === chatId) {
      setCurrentChat({ ...currentChat, title: newTitle });
    }
  };

  const copyChat = (chatToCopy: Chat) => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `${chatToCopy.title} (Copy)`,
      messages: chatToCopy.messages.map(msg => ({
        ...msg,
        id: Date.now().toString() + Math.random(),
      })),
      createdAt: new Date(),
      language: chatToCopy.language,
      modelType: chatToCopy.modelType
    };
    setChats([newChat, ...chats]);
    setCurrentChat(newChat);
    setShowMobileMenu(false);
  };

  const toggleFavorite = (chatId: string) => {
    setFavoriteChats(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId) 
        : [...prev, chatId]
    );
  };

  const copyMessageToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      setError('Failed to copy message to clipboard');
      console.error('Failed to copy text: ', err);
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || !currentChat || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    let updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage],
    };

    setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
    setCurrentChat(updatedChat);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          language: currentChat.language || 'English',
          modelType: currentChat.modelType || 'standard'
        })
      });

      if (!response.ok) {
        throw new Error(response.statusText || 'Failed to get response from server');
      }

      const data = await response.json();
      const botMessageContent = data.response;
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: botMessageContent,
        sender: 'bot',
        timestamp: new Date(),
      };

      updatedChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, botMessage],
      };

      setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
      setCurrentChat(updatedChat);

      if (updatedChat.messages.length === 2 && updatedChat.title === 'New Conversation') {
        let title = userMessage.content;
        if (title.length > 30) {
          title = title.substring(0, 30) + '...';
        }
        renameChat(updatedChat.id, title);
      }
    } catch (error) {
      console.error('Error during chat:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, something went wrong. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      updatedChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, errorMessage],
      };
      setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
      setCurrentChat(updatedChat);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const deleteChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (currentChat?.id === chatId) {
      setCurrentChat(null);
    }
    setDeleteConfirm(null);
    setFavoriteChats(favoriteChats.filter(id => id !== chatId));
  };

  const deleteMessage = (messageId: string) => {
    if (!currentChat) return;
    const updatedMessages = currentChat.messages.filter(
      message => message.id !== messageId
    );
    const updatedChat = {
      ...currentChat,
      messages: updatedMessages,
    };
    setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
    setCurrentChat(updatedChat);
    setDeleteConfirm(null);
  };

  const downloadPDF = () => {
    if (!currentChat) return;
    try {
      const doc = new jsPDF();
      let yPos = 20;
      doc.setFontSize(16);
      doc.text(currentChat.title, 20, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.text(`Generated by Trainify.ai - ${new Date().toLocaleDateString()}`, 20, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(`Language: ${currentChat.language} | Model: ${currentChat.modelType}`, 20, yPos);
      yPos += 15;
      doc.setFontSize(12);
      
      currentChat.messages.forEach((message) => {
        const prefix = message.sender === 'user' ? 'You: ' : 'Trainify: ';
        const text = `${prefix}${message.content.replace(/\n/g, ' ')}`;
        const lines = doc.splitTextToSize(text, 170);
        
        if (yPos + (lines.length * 7) > 280) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.text(lines, 20, yPos);
        yPos += (lines.length * 7) + 5;
      });
      
      doc.save(`trainify-${currentChat.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
    } catch (error) {
      setError('Failed to generate PDF. Please try again.');
      console.error('Error generating PDF:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !currentChat) return;
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      // Read file for preview
      let preview = '';
      if (file.type.startsWith('text/')) {
        preview = await file.text();
        if (preview.length > 1000) {
          preview = preview.substring(0, 1000) + '...';
        }
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetLanguage', currentChat.language || 'English');
      formData.append('modelType', currentChat.modelType || 'standard');

      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const uploadResponse = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(uploadResponse.statusText || 'File upload failed');
      }

      const uploadData = await uploadResponse.json();
      const userMessage: Message = {
        id: Date.now().toString(),
        content: `📄 Uploaded file: ${file.name}`,
        sender: 'user',
        timestamp: new Date(),
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
          preview
        }
      };

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `✅ Translation (${currentChat.language}):\n\n${uploadData.translatedText}`,
        sender: 'bot',
        timestamp: new Date()
      };

      const updatedChat = {
        ...currentChat,
        messages: [...currentChat.messages, userMessage, botMessage],
      };

      setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
      setCurrentChat(updatedChat);

      if (updatedChat.messages.length === 2 && updatedChat.title === 'New Conversation') {
        const title = `File: ${file.name.substring(0, 20)}${file.name.length > 20 ? '...' : ''}`;
        renameChat(updatedChat.id, title);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to process file');
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: `❌ Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'bot',
        timestamp: new Date(),
      };
      const updatedChat = {
        ...currentChat,
        messages: [...currentChat.messages, errorMessage],
      };
      setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
      setCurrentChat(updatedChat);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleLanguageChange = (language: string) => {
    if (!currentChat) return;
    const updatedChat = {
      ...currentChat,
      language
    };
    setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
    setCurrentChat(updatedChat);
    setShowLanguageDropdown(false);
  };

  const handleModelChange = (modelType: 'standard' | 'advanced') => {
    if (!currentChat) return;
    const updatedChat = {
      ...currentChat,
      modelType
    };
    setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
    setCurrentChat(updatedChat);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    }
  };

  const groupChatsByDate = () => {
    const grouped: { [key: string]: Chat[] } = {};
    chats.forEach(chat => {
      const dateKey = formatDate(new Date(chat.createdAt));
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(chat);
    });
    return grouped;
  };

  const groupedChats = groupChatsByDate();

  return (
    <div className={`flex h-screen ${darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <SignedOut>
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 rounded-xl shadow-2xl w-full max-w-md mx-4 backdrop-blur-sm bg-black bg-opacity-20 border border-white border-opacity-10"
          >
            <div className="flex items-center justify-center mb-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              >
                <Cpu size={32} className="text-blue-400 mr-2" />
              </motion.div>
              <h2 className="text-3xl font-bold text-white">Trainify.ai</h2>
            </div>
            <p className="text-center mb-6 text-blue-100">Your AI-powered language training assistant</p>
            <SignIn routing="hash" signUpUrl="/sign-up" afterSignInUrl="/" />
          </motion.div>
        </div>
      </SignedOut>

      <SignedIn>
        {/* Mobile header */}
        <div className={`md:hidden fixed top-0 left-0 right-0 z-30 p-3 flex justify-between items-center ${darkMode ? 'bg-gray-900/90 border-b border-gray-800 backdrop-blur-sm' : 'bg-white/90 border-b border-gray-200 backdrop-blur-sm'}`}>
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)} 
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            {showMobileMenu ? (
              <X size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
            ) : (
              <Menu size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Cpu size={20} className="text-blue-500" />
            <h1 className="font-bold">Trainify.ai</h1>
          </div>
          <div className="w-8">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        {/* Mobile menu overlay */}
        {showMobileMenu && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden" 
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* Sidebar */}
        <motion.div 
          initial={{ x: -300 }}
          animate={{ x: showMobileMenu ? 0 : -300 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed md:relative z-20 h-full ${showSidebar ? 'w-72' : 'w-0'} ${darkMode ? 'bg-gray-900/95 border-gray-800' : 'bg-white/95 border-gray-200'} border-r flex flex-col overflow-hidden backdrop-blur-sm`}
        >
          <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-gray-800' : 'border-gray-200'} mt-12 md:mt-0`}>
            <div className="flex items-center gap-2">
              <Cpu size={24} className="text-blue-500" />
              <h1 className="font-bold text-xl">Trainify.ai</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className={`p-2 rounded-full transition-all ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                {darkMode ? (
                  <span className="text-sm">☀️</span>
                ) : (
                  <span className="text-sm">🌙</span>
                )}
              </button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onMouseEnter={() => setIsHoveringNewChat(true)}
            onMouseLeave={() => setIsHoveringNewChat(false)}
            onClick={createNewChat} 
            className="m-4 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all font-medium shadow-md"
          >
            <Plus size={20} />
            <span>New Conversation</span>
            {isHoveringNewChat && <ChevronRight size={18} className="ml-1" />}
          </motion.button>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700/50 scrollbar-track-transparent pb-20 md:pb-0">
            {chats.length === 0 ? (
              <div className={`text-center p-8 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              Object.entries(groupedChats).map(([date, dateChats]) => (
                <div key={date}>
                  <div className={`px-4 py-2 text-xs font-medium ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    {date}
                  </div>
                  {dateChats.map(chat => (
                    <motion.div 
                      key={chat.id}
                      whileHover={{ x: 5 }}
                      className={`group flex items-center justify-between p-3 cursor-pointer transition-all duration-150 ${currentChat?.id === chat.id ? (darkMode ? 'bg-gray-800/80 border-l-4 border-blue-500' : 'bg-blue-50/80 border-l-4 border-blue-500') : (darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100/80')}`}
                      onClick={() => {
                        setCurrentChat(chat);
                        setShowMobileMenu(false);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {favoriteChats.includes(chat.id) && (
                            <Star size={16} className="text-yellow-500 fill-yellow-500" />
                          )}
                          <span className="text-sm font-medium truncate">
                            {chat.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            {chat.language}
                          </span>
                          <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>•</span>
                          <span className={`text-xs ${chat.modelType === 'advanced' ? 'text-purple-400' : (darkMode ? 'text-gray-500' : 'text-gray-500')}`}>
                            {chat.modelType === 'advanced' ? 'Advanced' : 'Standard'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(chat.id);
                          }}
                          className={`${favoriteChats.includes(chat.id) ? '' : 'opacity-0 group-hover:opacity-100'} p-1 rounded transition-all ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} ${favoriteChats.includes(chat.id) ? 'text-yellow-500' : 'hover:text-yellow-500'}`}
                          title={favoriteChats.includes(chat.id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star size={16} className={favoriteChats.includes(chat.id) ? "fill-yellow-500" : ""} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyChat(chat);
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${darkMode ? 'hover:bg-gray-700 hover:text-blue-400' : 'hover:bg-gray-200 hover:text-blue-600'}`}
                          title="Duplicate chat"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ id: chat.id, type: 'chat' });
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${darkMode ? 'hover:bg-gray-700 hover:text-red-400' : 'hover:bg-gray-200 hover:text-red-600'}`}
                          title="Delete chat"
                        >
                          <Trash2 size={16} />
                        </button>
                        {deleteConfirm?.id === chat.id && deleteConfirm.type === 'chat' && (
                          <DeleteConfirm 
                            message="Delete this conversation?" 
                            onConfirm={() => deleteChat(chat.id)} 
                            onCancel={() => setDeleteConfirm(null)} 
                          />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))
            )}
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col pt-12 md:pt-0">
          {currentChat ? (
            <>
              <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-white/80'} backdrop-blur-sm`}>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowMobileMenu(!showMobileMenu)} 
                    className="md:hidden p-1 hover:bg-gray-800 rounded transition-colors"
                  >
                    <Menu size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles size={18} className="text-blue-500" />
                      {currentChat.title}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 border text-sm transition-all ${darkMode ? 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-100'}`}
                    >
                      <Languages size={16} />
                      {currentChat.language || 'English'}
                      <ChevronDown size={16} className={`transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showLanguageDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`absolute right-0 mt-1 w-48 rounded-lg shadow-lg z-10 overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}
                      >
                        {languages.map((lang) => (
                          <button
                            key={lang.value}
                            onClick={() => handleLanguageChange(lang.value)}
                            className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-blue-500 hover:text-white transition-colors ${darkMode ? 'hover:bg-blue-600' : 'hover:bg-blue-500'} ${currentChat.language === lang.value ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'text-gray-100' : 'text-gray-800')}`}
                          >
                            <span>{lang.label}</span>
                            {currentChat.language === lang.value && <Check size={16} />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                  <select
                    value={currentChat.modelType || 'standard'}
                    onChange={(e) => handleModelChange(e.target.value as 'standard' | 'advanced')}
                    className={`rounded-lg px-3 py-1.5 border text-sm focus:outline-none transition-all ${darkMode ? 'bg-gray-800 text-gray-100 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-100'}`}
                    aria-label="Select model"
                  >
                    <option value="standard">Standard</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <button
                    onClick={downloadPDF}
                    className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700 text-gray-300 hover:text-blue-400' : 'hover:bg-gray-100 text-gray-600 hover:text-blue-600'}`}
                    title="Download as PDF"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
                {error && <ErrorMessage message={error} />}
                
                {currentChat.messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center"
                  >
                    <div className={`p-6 rounded-full mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} shadow-inner`}>
                      <MessageSquarePlus size={32} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Start a conversation</h3>
                    <p className={`max-w-md mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Ask questions, upload files, or practice your language skills with Trainify AI
                    </p>
                    <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                      <button
                        onClick={() => {
                          setInputMessage("Can you help me practice conversational English?");
                          setTimeout(() => inputRef.current?.focus(), 100);
                        }}
                        className={`p-3 rounded-lg text-sm text-left ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                      >
                        Practice conversation
                      </button>
                      <button
                        onClick={() => {
                          setInputMessage("Translate this to Spanish: Hello, how are you?");
                          setTimeout(() => inputRef.current?.focus(), 100);
                        }}
                        className={`p-3 rounded-lg text-sm text-left ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                      >
                        Translation help
                      </button>
                      <button
                        onClick={triggerFileInput}
                        className={`p-3 rounded-lg text-sm text-left ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                      >
                        Upload a file
                      </button>
                      <button
                        onClick={() => {
                          setInputMessage("Explain this grammar rule: When to use 'the' in English?");
                          setTimeout(() => inputRef.current?.focus(), 100);
                        }}
                        className={`p-3 rounded-lg text-sm text-left ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                      >
                        Grammar question
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-6">
                    {currentChat.messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                          <div className={`mt-1 p-2 rounded-full ${message.sender === 'user' ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-800 text-blue-400' : 'bg-gray-200 text-blue-600'}`}>
                            {message.sender === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                          </div>
                          <div className={`max-w-[90%] md:max-w-3xl rounded-lg p-4 relative transition-all ${message.sender === 'user' ? darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white' : darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800 border border-gray-200'}`}>
                            {message.fileInfo && (
                              <FilePreview fileInfo={message.fileInfo} />
                            )}
                            <div className="whitespace-pre-wrap">
                              <MarkdownRenderer content={message.content} />
                            </div>
                            <div className={`absolute text-xs ${message.sender === 'user' ? darkMode ? 'text-blue-300' : 'text-blue-100' : darkMode ? 'text-gray-500' : 'text-gray-500'} bottom-1 right-2`}>
                              {formatTime(message.timestamp)}
                            </div>
                            <div className={`absolute flex gap-1 ${message.sender === 'user' ? '-left-10' : '-right-10'} top-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
                              <button
                                onClick={() => copyMessageToClipboard(message.content, message.id)}
                                className={`p-1.5 rounded-full ${darkMode ? 'hover:bg-gray-700 hover:text-blue-400' : 'hover:bg-gray-200 hover:text-blue-600'}`}
                                title="Copy message"
                              >
                                <Copy size={16} />
                              </button>
                              {message.sender === 'user' && (
                                <button
                                  onClick={() => setDeleteConfirm({ id: message.id, type: 'message' })}
                                  className={`p-1.5 rounded-full ${darkMode ? 'hover:bg-gray-700 hover:text-red-400' : 'hover:bg-gray-200 hover:text-red-600'}`}
                                  title="Delete message"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                            {copiedMessageId === message.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                              >
                                Copied!
                              </motion.div>
                            )}
                            {deleteConfirm?.id === message.id && deleteConfirm.type === 'message' && (
                              <DeleteConfirm
                                message="Delete this message?"
                                onConfirm={() => deleteMessage(message.id)}
                                onCancel={() => setDeleteConfirm(null)}
                              />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start gap-3"
                      >
                        <div className="mt-1 p-2 rounded-full bg-gray-800 text-blue-400">
                          <Bot size={16} />
                        </div>
                        <div className={`max-w-[90%] md:max-w-3xl rounded-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
                          <LoadingDots />
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              <div className={`fixed bottom-0 left-0 right-0 md:relative p-4 border-t ${darkMode ? 'border-gray-800 bg-gray-900/80' : 'border-gray-200 bg-white/80'} backdrop-blur-sm`}>
                <form onSubmit={sendMessage} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your message..."
                      className={`w-full rounded-lg py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${darkMode ? 'bg-gray-800 text-white placeholder-gray-400' : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200'}`}
                      disabled={isLoading || isUploading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        disabled={isLoading || isUploading}
                        className={`p-2 rounded-full transition-all ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-600'}`}
                        title="Upload file"
                      >
                        <Upload size={20} />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.json"
                        disabled={isLoading || isUploading}
                      />
                    </div>
                  </div>
                  <motion.button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading || isUploading}
                    whileHover={inputMessage.trim() && !isLoading && !isUploading ? { scale: 1.05 } : {}}
                    whileTap={inputMessage.trim() && !isLoading && !isUploading ? { scale: 0.95 } : {}}
                    onMouseEnter={() => setIsHoveringSend(true)}
                    onMouseLeave={() => setIsHoveringSend(false)}
                    className={`p-3 rounded-lg flex items-center justify-center transition-all ${inputMessage.trim() && !isLoading && !isUploading ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md' : darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-500'}`}
                  >
                    {isLoading || isUploading ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      <Send size={20} className={isHoveringSend && inputMessage.trim() ? 'animate-pulse' : ''} />
                    )}
                  </motion.button>
                </form>
                <div className={`text-xs mt-2 text-center ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                  {isUploading ? 'Uploading file...' : 'Trainify may produce inaccurate information'}
                </div>
              </div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center pt-12 md:pt-0"
            >
              <div className={`p-6 rounded-full mb-6 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} shadow-inner`}>
                <MessageSquare size={48} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
              </div>
              <h2 className="text-2xl font-medium mb-2">No conversation selected</h2>
              <p className={`max-w-md text-center mb-6 px-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Select an existing conversation from the sidebar or create a new one to get started
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createNewChat}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 px-6 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all font-medium shadow-md"
              >
                <Plus size={20} />
                New Conversation
              </motion.button>
            </motion.div>
          )}
        </div>
      </SignedIn>
    </div>
  );
}

export default App;
