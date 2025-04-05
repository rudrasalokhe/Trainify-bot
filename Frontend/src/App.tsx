import React, { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, Send, MessageSquare, Trash2, Download, ChevronLeft, ChevronRight, Copy, Upload, Plus, AlignLeft, Sparkles, Settings, RefreshCw, BookOpen, Star, Cpu, Menu, X, Languages, Zap, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { SignedIn, SignedOut, SignIn, UserButton, useAuth } from '@clerk/clerk-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  fileInfo?: {
    name: string;
    size: number;
    type: string;
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
  <div className="absolute right-0 top-0 bg-zinc-800 rounded-lg shadow-xl p-3 z-10 border border-zinc-700 animate-fade-in backdrop-blur-sm bg-opacity-90">
    <p className="text-sm mb-2">{message}</p>
    <div className="flex gap-2 justify-end">
      <button
        onClick={onCancel}
        className="px-3 py-1 text-sm bg-zinc-700 rounded-lg hover:bg-zinc-600 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="px-3 py-1 text-sm bg-red-600 rounded-lg hover:bg-red-500 transition-colors"
      >
        Delete
      </button>
    </div>
  </div>
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

function App() {
  const { getToken } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'chat' | 'message' } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [favoriteChats, setFavoriteChats] = useState<string[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setShowSidebar(window.innerWidth > 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const savedChats = localStorage.getItem('trainify-chats');
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats);
        parsedChats.forEach((chat: Chat) => {
          chat.createdAt = new Date(chat.createdAt);
          chat.messages.forEach((msg: Message) => {
            msg.timestamp = new Date(msg.timestamp);
          });
        });
        setChats(parsedChats);
      } catch (e) {
        console.error('Error parsing saved chats:', e);
      }
    }
    
    const savedFavorites = localStorage.getItem('trainify-favorites');
    if (savedFavorites) {
      try {
        setFavoriteChats(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error parsing favorites:', e);
      }
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('trainify-chats', JSON.stringify(chats));
  }, [chats]);
  
  useEffect(() => {
    localStorage.setItem('trainify-favorites', JSON.stringify(favoriteChats));
  }, [favoriteChats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `New Conversation`,
      messages: [],
      createdAt: new Date(),
      language: 'English',
      modelType: 'standard'
    };
    setChats([newChat, ...chats]);
    setCurrentChat(newChat);
    setShowMobileMenu(false);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
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
    if (favoriteChats.includes(chatId)) {
      setFavoriteChats(favoriteChats.filter(id => id !== chatId));
    } else {
      setFavoriteChats([...favoriteChats, chatId]);
    }
  };

  const copyMessageToClipboard = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
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

    try {
      const token = await getToken();
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
        throw new Error(`HTTP error! status: ${response.status}`);
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
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, something went wrong. Please try again or refresh the page.',
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
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const deleteChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (currentChat?.id === chatId) {
      setCurrentChat(null);
    }
    setDeleteConfirm(null);
    if (favoriteChats.includes(chatId)) {
      setFavoriteChats(favoriteChats.filter(id => id !== chatId));
    }
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

    setChats(chats.map(chat =>
      chat.id === currentChat.id ? updatedChat : chat
    ));
    setCurrentChat(updatedChat);
    setDeleteConfirm(null);
  };

  const downloadPDF = () => {
    if (!currentChat) return;

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
      const text = `${prefix}${message.content}`;
      const lines = doc.splitTextToSize(text, 170);

      if (yPos + (lines.length * 7) > 280) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(lines, 20, yPos);
      yPos += (lines.length * 7) + 5;
    });

    doc.save(`trainify-${currentChat.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !currentChat) return;
   
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
   
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetLanguage', currentChat.language || 'English');
      formData.append('modelType', currentChat.modelType || 'standard');

      const token = await getToken();
      const uploadResponse = await fetch(`${API_BASE_URL}/api/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload failed');
      }

      const uploadData = await uploadResponse.json();

      const userMessage: Message = {
        id: Date.now().toString(),
        content: `📄 Uploaded file: ${file.name}\n\n${uploadData.contentPreview}`,
        sender: 'user',
        timestamp: new Date(),
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type
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
        const title = `File: ${file.name}`;
        renameChat(updatedChat.id, title);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
     
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

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!currentChat) return;
   
    const updatedChat = {
      ...currentChat,
      language: e.target.value
    };

    setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
    setCurrentChat(updatedChat);
  };
  
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!currentChat) return;
   
    const updatedChat = {
      ...currentChat,
      modelType: e.target.value as 'standard' | 'advanced'
    };

    setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
    setCurrentChat(updatedChat);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric'
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
    <div className={`flex h-screen ${darkMode ? 'bg-gradient-to-br from-gray-900 to-gray-950 text-gray-100' : 'bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900'}`}>
      <SignedOut>
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900">
          <div className="p-8 rounded-2xl shadow-2xl w-full max-w-md mx-4 backdrop-blur-sm bg-black bg-opacity-30 border border-white border-opacity-10">
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <Cpu size={40} className="text-blue-400 mr-3" />
                <h2 className="text-4xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Trainify.ai
                </h2>
              </div>
              <p className="text-center text-blue-100 text-lg mb-2">Your AI-powered language training assistant</p>
              <p className="text-center text-blue-200 text-sm max-w-md">
                Practice languages, get translations, and improve your skills with our intelligent AI assistant
              </p>
            </div>
            <SignIn
              routing="hash"
              signUpUrl="/sign-up"
              afterSignInUrl="/"
              appearance={{
                elements: {
                  card: 'bg-transparent shadow-none border-0',
                  headerTitle: 'text-white',
                  headerSubtitle: 'text-blue-200',
                  socialButtonsBlockButton: 'border-white/20 hover:bg-white/10',
                  dividerLine: 'bg-white/20',
                  formFieldLabel: 'text-white',
                  formFieldInput: 'bg-white/10 border-white/20 text-white focus:border-blue-400 focus:shadow-blue-400/10',
                  footerActionText: 'text-white',
                  footerActionLink: 'text-blue-300 hover:text-blue-200',
                }
              }}
            />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {/* Mobile header */}
        <div className={`md:hidden fixed top-0 left-0 right-0 z-30 p-3 flex justify-between items-center ${
          darkMode ? 'bg-gray-900/90 backdrop-blur-sm border-b border-gray-800' : 'bg-white/90 backdrop-blur-sm border-b border-gray-200'
        }`}>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 rounded-full hover:bg-gray-800/50 transition-colors"
          >
            {showMobileMenu ? (
              <X size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
            ) : (
              <Menu size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
            )}
          </button>
          
          <div className="flex items-center gap-2">
            <Cpu size={20} className="text-blue-500" />
            <h1 className="font-bold text-lg bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              Trainify.ai
            </h1>
          </div>
          
          <div className="w-8">
            <UserButton 
              afterSignOutUrl="/" 
              appearance={{
                elements: {
                  userButtonAvatarBox: 'w-8 h-8',
                  userButtonPopoverCard: darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
                }
              }}
            />
          </div>
        </div>

        {/* Mobile menu overlay */}
        {showMobileMenu && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* Sidebar - mobile version */}
        <div className={`fixed md:relative z-20 h-full transition-transform duration-300 ease-in-out ${
          showMobileMenu ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${
          showSidebar ? 'w-80' : 'w-0'
        } ${
          darkMode ? 'bg-gray-900/95 backdrop-blur-sm border-gray-800' : 'bg-white/95 backdrop-blur-sm border-gray-200'
        } border-r flex flex-col overflow-hidden shadow-xl`}>
          <div className={`p-4 border-b flex justify-between items-center ${
            darkMode ? 'border-gray-800' : 'border-gray-200'
          } mt-12 md:mt-0`}>
            <div className="flex items-center gap-2">
              <Cpu size={24} className="text-blue-500" />
              <h1 className="font-bold text-xl bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                Trainify.ai
              </h1>
            </div>
            <div className="md:flex items-center gap-2 hidden">
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`p-2 rounded-full transition-colors ${
                  darkMode 
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-700'
                }`}
              >
                <Settings size={18} />
              </button>
              <UserButton 
                afterSignOutUrl="/" 
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-8 h-8',
                    userButtonPopoverCard: darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
                  }
                }}
              />
            </div>
          </div>
          
          {showSettings && (
            <div className={`p-4 border-b ${
              darkMode ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'
            }`}>
              <h2 className="font-medium mb-3 text-gray-500">Settings</h2>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm flex items-center gap-2">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Dark Mode</span>
                </span>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${
                    darkMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full transition-transform transform ${
                    darkMode ? 'bg-white translate-x-7' : 'bg-white translate-x-1'
                  }`}></span>
                </button>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all conversations? This cannot be undone.')) {
                      setChats([]);
                      setCurrentChat(null);
                      setFavoriteChats([]);
                    }
                  }}
                  className={`text-sm py-1.5 px-3 rounded-lg flex items-center gap-2 transition-colors ${
                    darkMode 
                      ? 'bg-red-900/50 hover:bg-red-900 text-red-200' 
                      : 'bg-red-100 hover:bg-red-200 text-red-800'
                  }`}
                >
                  <Trash2 size={16} />
                  Clear all conversations
                </button>
              </div>
            </div>
          )}
          
          <button
            onClick={createNewChat}
            className="mx-4 my-3 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg font-medium"
          >
            <Plus size={20} />
            New Conversation
          </button>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pb-20 md:pb-0">
            {chats.length === 0 ? (
              <div className={`text-center p-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
                <button
                  onClick={createNewChat}
                  className="mt-4 text-sm bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Create your first chat
                </button>
              </div>
            ) : (
              Object.entries(groupedChats).map(([date, dateChats]) => (
                <div key={date}>
                  <div className={`px-4 py-2 text-xs font-medium ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {date}
                  </div>
                  
                  {dateChats.map(chat => (
                    <div
                      key={chat.id}
                      className={`group flex items-center justify-between p-3 mx-2 rounded-lg cursor-pointer transition-all duration-150 ${
                        currentChat?.id === chat.id 
                        ? (darkMode 
                            ? 'bg-gray-800 border-l-4 border-blue-500' 
                            : 'bg-blue-50 border-l-4 border-blue-500')
                        : (darkMode
                            ? 'hover:bg-gray-800/50' 
                            : 'hover:bg-gray-100/50')
                      }`}
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
                          <span className={`text-xs flex items-center gap-1 ${
                            darkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            <Languages size={12} />
                            {chat.language}
                          </span>
                          <span className={`text-xs ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>•</span>
                          <span className={`text-xs flex items-center gap-1 ${
                            chat.modelType === 'advanced' 
                              ? 'text-purple-400' 
                              : (darkMode ? 'text-gray-500' : 'text-gray-500')
                          }`}>
                            <Zap size={12} className={chat.modelType === 'advanced' ? 'fill-purple-400/20' : ''} />
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
                          className={`${favoriteChats.includes(chat.id) ? '' : 'opacity-0 group-hover:opacity-100'} p-1.5 rounded-lg transition-all ${
                            darkMode 
                              ? 'hover:bg-gray-700/50' 
                              : 'hover:bg-gray-200/50'
                          } ${
                            favoriteChats.includes(chat.id) 
                              ? 'text-yellow-500' 
                              : 'hover:text-yellow-500 text-gray-500'
                          }`}
                          title={favoriteChats.includes(chat.id) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star size={16} className={favoriteChats.includes(chat.id) ? "fill-yellow-500" : ""} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyChat(chat);
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                            darkMode 
                              ? 'hover:bg-gray-700/50 text-gray-400 hover:text-blue-400' 
                              : 'hover:bg-gray-200/50 text-gray-500 hover:text-blue-600'
                          }`}
                          title="Duplicate chat"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ id: chat.id, type: 'chat' });
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                            darkMode 
                              ? 'hover:bg-gray-700/50 text-gray-400 hover:text-red-400' 
                              : 'hover:bg-gray-200/50 text-gray-500 hover:text-red-600'
                          }`}
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
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col pt-12 md:pt-0 overflow-hidden">
          {currentChat ? (
            <>
              <div className={`p-4 border-b flex justify-between items-center shadow-sm z-10 ${
                darkMode 
                  ? 'border-gray-800 bg-gray-900/80 backdrop-blur-sm' 
                  : 'border-gray-200 bg-white/80 backdrop-blur-sm'
              }`}>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    <Menu size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles size={18} className="text-blue-500" />
                      <span className="truncate max-w-[180px] md:max-w-xs">{currentChat.title}</span>
                    </h2>
                    <p className={`text-xs flex items-center gap-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      <span className="flex items-center gap-1">
                        <Languages size={12} />
                        {currentChat.language}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Zap size={12} className={currentChat.modelType === 'advanced' ? 'fill-purple-400/20' : ''} />
                        {currentChat.modelType === 'advanced' ? 'Advanced Model' : 'Standard Model'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={currentChat.modelType || 'standard'}
                    onChange={handleModelChange}
                    className={`rounded-lg px-3 py-1.5 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-800 text-gray-100 border-gray-700' 
                        : 'bg-white text-gray-800 border-gray-200'
                    }`}
                    aria-label="Select model"
                  >
                    <option value="standard">Standard</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  
                  <select
                    value={currentChat.language || 'English'}
                    onChange={handleLanguageChange}
                    className={`rounded-lg px-3 py-1.5 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      darkMode 
                        ? 'bg-gray-800 text-gray-100 border-gray-700' 
                        : 'bg-white text-gray-800 border-gray-200'
                    }`}
                    aria-label="Select language"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
                {currentChat.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className={`p-6 rounded-full mb-4 ${
                      darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <MessageSquarePlus size={32} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                    </div>
                    <h3 className="text-xl font-medium mb-2">Start a conversation</h3>
                    <p className={`max-w-md mb-6 ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Ask questions, upload files, or practice your language skills with Trainify AI
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md">
                      <button
                        onClick={() => {
                          setInputMessage('Can you help me practice my conversation skills?');
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                        }}
                        className={`px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        } transition-colors`}
                      >
                        <MessageSquare size={16} />
                        Practice conversation
                      </button>
                      <button
                        onClick={() => {
                          setInputMessage('Explain this grammar rule: ');
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                        }}
                        className={`px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        } transition-colors`}
                      >
                        <AlignLeft size={16} />
                        Ask about grammar
                      </button>
                      <button
                        onClick={() => {
                          triggerFileInput();
                        }}
                        className={`px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        } transition-colors`}
                      >
                        <FileText size={16} />
                        Upload document
                      </button>
                      <button
                        onClick={() => {
                          setInputMessage('What are some common phrases in this language?');
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                        }}
                        className={`px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        } transition-colors`}
                      >
                        <Languages size={16} />
                        Common phrases
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 max-w-4xl mx-auto">
                    {currentChat.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`group flex gap-3 ${
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[90%] md:max-w-3xl rounded-xl p-4 relative transition-all ${
                            message.sender === 'user'
                              ? darkMode
                                ? 'bg-gradient-to-br from-blue-700 to-blue-800 text-blue-50'
                                : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                              : darkMode
                              ? 'bg-gray-800 text-gray-100'
                              : 'bg-white text-gray-800 border border-gray-200'
                          }`}
                        >
                          {message.fileInfo && (
                            <div className={`text-xs mb-2 p-2 rounded-lg ${
                              darkMode ? 'bg-gray-700/50' : 'bg-gray-100'
                            }`}>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">File:</span>
                                <span>{message.fileInfo.name}</span>
                                <span className="opacity-70">({(message.fileInfo.size / 1024).toFixed(1)} KB)</span>
                              </div>
                            </div>
                          )}
                          <div className="whitespace-pre-wrap">
                            {message.content}
                          </div>
                          <div className={`absolute text-xs ${
                            message.sender === 'user'
                              ? darkMode
                                ? 'text-blue-300'
                                : 'text-blue-100'
                              : darkMode
                              ? 'text-gray-500'
                              : 'text-gray-500'
                          } bottom-1 right-2`}>
                            {formatTime(message.timestamp)}
                          </div>
                          <div className={`absolute flex gap-1 ${
                            message.sender === 'user' ? '-left-10' : '-right-10'
                          } top-0 opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button
                              onClick={() => copyMessageToClipboard(message.content, message.id)}
                              className={`p-1.5 rounded-lg ${
                                darkMode 
                                  ? 'hover:bg-gray-700/50 text-gray-400 hover:text-blue-400' 
                                  : 'hover:bg-gray-200/50 text-gray-500 hover:text-blue-600'
                              } transition-colors`}
                              title="Copy message"
                            >
                              <Copy size={16} />
                            </button>
                            {message.sender === 'user' && (
                              <button
                                onClick={() => setDeleteConfirm({ id: message.id, type: 'message' })}
                                className={`p-1.5 rounded-lg ${
                                  darkMode 
                                    ? 'hover:bg-gray-700/50 text-gray-400 hover:text-red-400' 
                                    : 'hover:bg-gray-200/50 text-gray-500 hover:text-red-600'
                                } transition-colors`}
                                title="Delete message"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                          {copiedMessageId === message.id && (
                            <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded-lg text-xs ${
                              darkMode ? 'bg-gray-800' : 'bg-gray-200'
                            } shadow-md`}>
                              Copied!
                            </div>
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
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className={`fixed bottom-0 left-0 right-0 md:relative p-4 border-t ${
                darkMode ? 'border-gray-800 bg-gray-900/80 backdrop-blur-sm' : 'border-gray-200 bg-white/80 backdrop-blur-sm'
              }`}>
                <form onSubmit={sendMessage} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your message..."
                      className={`w-full rounded-xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-800 text-white placeholder-gray-500 border-gray-700' 
                          : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200'
                      } border shadow-sm`}
                      disabled={isLoading || isUploading}
                    />
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        disabled={isLoading || isUploading}
                        className={`p-2 rounded-lg ${
                          darkMode 
                            ? 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-300' 
                            : 'hover:bg-gray-100/50 text-gray-500 hover:text-gray-600'
                        } transition-colors`}
                        title="Upload file"
                      >
                        <Upload size={20} />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                        disabled={isLoading || isUploading}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading || isUploading}
                    className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                      inputMessage.trim() && !isLoading && !isUploading
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md'
                        : darkMode
                        ? 'bg-gray-800 text-gray-500'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isLoading || isUploading ? (
                      <RefreshCw size={20} className="animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </form>
                <div className={`text-xs mt-2 text-center ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {isUploading ? 'Uploading file...' : 'Trainify may produce inaccurate information'}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center pt-12 md:pt-0">
              <div className={`p-6 rounded-full mb-6 ${
                darkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <MessageSquare size={48} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
              </div>
              <h2 className="text-2xl font-medium mb-2">No conversation selected</h2>
              <p className={`max-w-md text-center mb-6 px-4 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Select an existing conversation from the sidebar or create a new one to get started
              </p>
              <button
                onClick={createNewChat}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg font-medium"
              >
                <Plus size={20} />
                New Conversation
              </button>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md px-4">
                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                } border ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlignLeft size={18} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                    <h3 className="font-medium">Language Practice</h3>
                  </div>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Improve your conversation skills with AI-powered practice
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                } border ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={18} className={darkMode ? 'text-purple-400' : 'text-purple-600'} />
                    <h3 className="font-medium">Document Translation</h3>
                  </div>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Upload files and get translations with explanations
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                } border ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Languages size={18} className={darkMode ? 'text-green-400' : 'text-green-600'} />
                    <h3 className="font-medium">Grammar Assistance</h3>
                  </div>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Get detailed explanations of grammar rules
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${
                  darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                } border ${
                  darkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={18} className={darkMode ? 'text-yellow-400' : 'text-yellow-600'} />
                    <h3 className="font-medium">Advanced AI</h3>
                  </div>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Switch to advanced model for complex queries
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </SignedIn>
    </div>
  );
}

export default App;
