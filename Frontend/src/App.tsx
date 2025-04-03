import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquarePlus, Send, MessageSquare, Trash2, Download, 
  ChevronLeft, ChevronRight, Copy, Upload, Plus, AlignLeft, 
  Sparkles, Settings, RefreshCw, BookOpen, Star, Cpu, Menu, X,
  Languages, FileText, Bot, User, Mic, MicOff, Image, Video
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
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
    url?: string;
  };
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  language?: string;
  modelType?: 'standard' | 'advanced';
  isPinned?: boolean;
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
    className="absolute right-0 top-0 bg-zinc-800 rounded-lg shadow-xl p-3 z-10 border border-zinc-700"
  >
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
  </motion.div>
);

const languages = [
  { value: 'Chinese', label: '中文', flag: '🇨🇳' },
  { value: 'English', label: 'English', flag: '🇬🇧' },
  { value: 'Spanish', label: 'Español', flag: '🇪🇸' },
  { value: 'French', label: 'Français', flag: '🇫🇷' },
  { value: 'German', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'Japanese', label: '日本語', flag: '🇯🇵' },
  { value: 'Korean', label: '한국어', flag: '🇰🇷' },
  { value: 'Russian', label: 'Русский', flag: '🇷🇺' },
  { value: 'Arabic', label: 'العربية', flag: '🇸🇦' },
  { value: 'Portuguese', label: 'Português', flag: '🇵🇹' },
  { value: 'Italian', label: 'Italiano', flag: '🇮🇹' },
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
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle dark mode class on body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Check screen size and adjust sidebar
  useEffect(() => {
    const handleResize = () => {
      setShowSidebar(window.innerWidth > 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load data from localStorage
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
    
    const savedPinned = localStorage.getItem('trainify-pinned');
    if (savedPinned) {
      try {
        setPinnedChats(JSON.parse(savedPinned));
      } catch (e) {
        console.error('Error parsing pinned chats:', e);
      }
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('trainify-chats', JSON.stringify(chats));
  }, [chats]);
  
  useEffect(() => {
    localStorage.setItem('trainify-pinned', JSON.stringify(pinnedChats));
  }, [pinnedChats]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `New Conversation ${chats.length + 1}`,
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

  const togglePin = (chatId: string) => {
    if (pinnedChats.includes(chatId)) {
      setPinnedChats(pinnedChats.filter(id => id !== chatId));
    } else {
      setPinnedChats([...pinnedChats, chatId]);
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

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

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
      
      if (updatedChat.messages.length === 2 && updatedChat.title.startsWith('New Conversation')) {
        let title = userMessage.content;
        if (title.length > 30) title = title.substring(0, 30) + '...';
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
    if (pinnedChats.includes(chatId)) {
      setPinnedChats(pinnedChats.filter(id => id !== chatId));
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

      if (!uploadResponse.ok) throw new Error('File upload failed');

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
      
      if (updatedChat.messages.length === 2 && updatedChat.title.startsWith('New Conversation')) {
        renameChat(updatedChat.id, `File: ${file.name}`);
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
    setShowModelDropdown(false);
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
    
    // Separate pinned chats
    const pinned = chats.filter(chat => pinnedChats.includes(chat.id));
    const unpinned = chats.filter(chat => !pinnedChats.includes(chat.id));
    
    if (pinned.length > 0) {
      grouped['Pinned'] = pinned;
    }
    
    unpinned.forEach(chat => {
      const dateKey = formatDate(new Date(chat.createdAt));
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(chat);
    });
    
    return grouped;
  };
  
  const groupedChats = groupChatsByDate();

  // Voice input handler
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    setIsListening(!isListening);
    
    if (!isListening) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onstart = () => {
        setIsListening(true);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(prev => prev + ' ' + transcript);
        setIsListening(false);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.start();
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
        handleFileUpload(e as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  return (
    <div className={`flex h-screen bg-gradient-to-b ${darkMode ? 'from-gray-900 to-gray-950 text-gray-100' : 'from-gray-50 to-gray-100 text-gray-900'}`}>
      <SignedOut>
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 rounded-xl shadow-2xl w-full max-w-md mx-4 backdrop-blur-sm bg-black bg-opacity-20 border border-white border-opacity-10"
          >
            <div className="flex items-center justify-center mb-6">
              <Cpu size={32} className="text-blue-400 mr-2" />
              <h2 className="text-3xl font-bold text-white">Trainify.ai</h2>
            </div>
            <p className="text-center mb-6 text-blue-100">Your AI-powered language training assistant</p>
            <SignIn
              routing="hash"
              signUpUrl="/sign-up"
              afterSignInUrl="/"
            />
          </motion.div>
        </div>
      </SignedOut>

      <SignedIn>
        {/* Mobile header */}
        <div className={`md:hidden fixed top-0 left-0 right-0 z-30 p-3 flex justify-between items-center ${
          darkMode ? 'bg-gray-900 border-b border-gray-800' : 'bg-white border-b border-gray-200'
        }`}>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 rounded-full"
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
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* Sidebar */}
        <motion.div 
          initial={{ x: '-100%' }}
          animate={{ x: showMobileMenu ? 0 : '-100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`fixed md:relative z-20 h-full ${
            showSidebar ? 'w-72' : 'w-0'
          } ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-r flex flex-col overflow-hidden shadow-xl`}
        >
          <div className={`p-4 border-b flex justify-between items-center ${
            darkMode ? 'border-gray-800' : 'border-gray-200'
          } mt-12 md:mt-0`}>
            <div className="flex items-center gap-2">
              <Cpu size={24} className="text-blue-500" />
              <h1 className="font-bold text-xl">Trainify.ai</h1>
            </div>
            <div className="md:flex items-center gap-2 hidden">
              <button 
                onClick={() => setShowSettings(!showSettings)} 
                className={`p-2 rounded-full ${
                  darkMode 
                    ? 'hover:bg-gray-800' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <Settings size={18} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
              </button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
          
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`overflow-hidden border-b ${
                darkMode ? 'border-gray-800 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="p-4">
                <h2 className="font-medium mb-3">Settings</h2>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Dark Mode</span>
                  <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${
                      darkMode ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full transition-transform transform ${
                      darkMode ? 'bg-white translate-x-6' : 'bg-white translate-x-1'
                    }`}></span>
                  </button>
                </div>
                <div className="mt-4">
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all conversations? This cannot be undone.')) {
                        setChats([]);
                        setCurrentChat(null);
                        setPinnedChats([]);
                      }
                    }}
                    className={`text-sm py-1 px-2 rounded ${
                      darkMode 
                        ? 'bg-red-900 hover:bg-red-800 text-red-200' 
                        : 'bg-red-100 hover:bg-red-200 text-red-800'
                    }`}
                  >
                    Clear all conversations
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          
          <button
            onClick={createNewChat}
            className="m-4 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium"
          >
            <Plus size={20} />
            New Conversation
          </button>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pb-20 md:pb-0">
            {chats.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-center p-8 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}
              >
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </motion.div>
            ) : (
              Object.entries(groupedChats).map(([date, dateChats]) => (
                <div key={date}>
                  <div className={`px-4 py-2 text-xs font-medium ${
                    darkMode ? 'text-gray-500' : 'text-gray-500'
                  }`}>
                    {date}
                  </div>
                  
                  {dateChats.map(chat => (
                    <motion.div
                      key={chat.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`group flex items-center justify-between p-3 cursor-pointer transition-all duration-150 ${
                        currentChat?.id === chat.id 
                        ? (darkMode 
                            ? 'bg-gray-800 border-l-4 border-blue-500' 
                            : 'bg-blue-50 border-l-4 border-blue-500')
                        : (darkMode
                            ? 'hover:bg-gray-800' 
                            : 'hover:bg-gray-100')
                      }`}
                      onClick={() => {
                        setCurrentChat(chat);
                        setShowMobileMenu(false);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {pinnedChats.includes(chat.id) && (
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
                          <span className={`text-xs ${
                            chat.modelType === 'advanced' 
                              ? 'text-purple-400' 
                              : (darkMode ? 'text-gray-500' : 'text-gray-500')
                          }`}>
                            {chat.modelType === 'advanced' ? 'Advanced' : 'Standard'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(chat.id);
                          }}
                          className={`${pinnedChats.includes(chat.id) ? '' : 'opacity-0 group-hover:opacity-100'} p-1 rounded transition-all ${
                            darkMode 
                              ? 'hover:bg-gray-700' 
                              : 'hover:bg-gray-200'
                          } ${
                            pinnedChats.includes(chat.id) 
                              ? 'text-yellow-500' 
                              : 'hover:text-yellow-500'
                          }`}
                          title={pinnedChats.includes(chat.id) ? "Unpin chat" : "Pin chat"}
                        >
                          <Star size={16} className={pinnedChats.includes(chat.id) ? "fill-yellow-500" : ""} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyChat(chat);
                          }}
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                            darkMode 
                              ? 'hover:bg-gray-700 hover:text-blue-400' 
                              : 'hover:bg-gray-200 hover:text-blue-600'
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
                          className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                            darkMode 
                              ? 'hover:bg-gray-700 hover:text-red-400' 
                              : 'hover:bg-gray-200 hover:text-red-600'
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
              <div className={`p-4 border-b flex justify-between items-center shadow-md z-10 ${
                darkMode 
                  ? 'border-gray-800 bg-gray-900' 
                  : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="md:hidden p-1"
                  >
                    <Menu size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles size={18} className="text-blue-500" />
                      {currentChat.title}
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      AI-Powered Language Assistant
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border text-sm ${
                        darkMode 
                          ? 'bg-gray-800 text-gray-100 border-gray-700' 
                          : 'bg-white text-gray-800 border-gray-200'
                      }`}
                    >
                      <Cpu size={16} />
                      {currentChat.modelType === 'advanced' ? 'Advanced' : 'Standard'}
                      <ChevronDown size={16} />
                    </button>
                    {showModelDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-10 ${
                          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        } border`}
                      >
                        <div className="py-1">
                          <button
                            onClick={() => handleModelChange('standard')}
                            className={`block w-full text-left px-4 py-2 text-sm ${
                              currentChat.modelType === 'standard'
                                ? darkMode
                                  ? 'bg-gray-700 text-white'
                                  : 'bg-gray-100 text-gray-900'
                                : darkMode
                                ? 'text-gray-300 hover:bg-gray-700'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            Standard Model
                          </button>
                          <button
                            onClick={() => handleModelChange('advanced')}
                            className={`block w-full text-left px-4 py-2 text-sm ${
                              currentChat.modelType === 'advanced'
                                ? darkMode
                                  ? 'bg-gray-700 text-white'
                                  : 'bg-gray-100 text-gray-900'
                                : darkMode
                                ? 'text-gray-300 hover:bg-gray-700'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            Advanced Model
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border text-sm ${
                        darkMode 
                          ? 'bg-gray-800 text-gray-100 border-gray-700' 
                          : 'bg-white text-gray-800 border-gray-200'
                      }`}
                    >
                      <Languages size={16} />
                      {languages.find(l => l.value === currentChat.language)?.flag || '🌐'}
                      <ChevronDown size={16} />
                    </button>
                    {showLanguageDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto ${
                          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                        } border`}
                      >
                        <div className="py-1">
                          {languages.map((lang) => (
                            <button
                              key={lang.value}
                              onClick={() => handleLanguageChange(lang.value)}
                              className={`block w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                                currentChat.language === lang.value
                                  ? darkMode
                                    ? 'bg-gray-700 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                  : darkMode
                                  ? 'text-gray-300 hover:bg-gray-700'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <span>{lang.flag}</span>
                              <span>{lang.label}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div 
                className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4 relative"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {isDragging && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500">
                    <div className="text-center p-6 bg-gray-900 bg-opacity-80 rounded-lg">
                      <Upload size={48} className="mx-auto mb-4 text-blue-400" />
                      <p className="text-xl font-medium text-white">Drop your file here</p>
                      <p className="text-gray-300 mt-2">Supported formats: PDF, DOC, TXT</p>
                    </div>
                  </div>
                )}

                {currentChat.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <motion.div 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={`p-6 rounded-full mb-4 ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-100'
                      }`}
                    >
                      <MessageSquarePlus size={32} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                    </motion.div>
                    <h3 className="text-xl font-medium mb-2">Start a conversation</h3>
                    <p className={`max-w-md mb-6 ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Ask questions, upload files, or practice your language skills with Trainify AI
                    </p>
                    <div className="flex gap-3 flex-wrap justify-center">
                      <button
                        onClick={() => {
                          setInputMessage('Can you help me practice my conversation skills?');
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        Practice conversation
                      </button>
                      <button
                        onClick={() => {
                          setInputMessage('Explain this grammar rule: ');
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        Ask about grammar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {currentChat.messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`group flex gap-3 ${
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[90%] md:max-w-3xl rounded-lg p-4 relative ${
                            message.sender === 'user'
                              ? darkMode
                                ? 'bg-blue-900 text-blue-100'
                                : 'bg-blue-600 text-white'
                              : darkMode
                              ? 'bg-gray-800 text-gray-100'
                              : 'bg-white text-gray-800 border border-gray-200'
                          } shadow-md`}
                        >
                          {message.fileInfo && (
                            <div className={`text-xs mb-2 p-2 rounded ${
                              darkMode ? 'bg-gray-700' : 'bg-gray-100'
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
                              className={`p-1.5 rounded-full ${
                                darkMode 
                                  ? 'hover:bg-gray-700 hover:text-blue-400' 
                                  : 'hover:bg-gray-200 hover:text-blue-600'
                              }`}
                              title="Copy message"
                            >
                              <Copy size={16} />
                            </button>
                            {message.sender === 'user' && (
                              <button
                                onClick={() => setDeleteConfirm({ id: message.id, type: 'message' })}
                                className={`p-1.5 rounded-full ${
                                  darkMode 
                                    ? 'hover:bg-gray-700 hover:text-red-400' 
                                    : 'hover:bg-gray-200 hover:text-red-600'
                                }`}
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
                              className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs ${
                                darkMode ? 'bg-gray-700' : 'bg-gray-200'
                              }`}
                            >
                              Copied!
                            </motion.div>
                          )}
                          <AnimatePresence>
                            {deleteConfirm?.id === message.id && deleteConfirm.type === 'message' && (
                              <DeleteConfirm
                                message="Delete this message?"
                                onConfirm={() => deleteMessage(message.id)}
                                onCancel={() => setDeleteConfirm(null)}
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className={`fixed bottom-0 left-0 right-0 md:relative p-4 border-t ${
                darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
              }`}>
                <form onSubmit={sendMessage} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your message..."
                      className={`w-full rounded-lg py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-800 text-white placeholder-gray-400' 
                          : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200'
                      }`}
                      disabled={isLoading || isUploading}
                    />
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button
                        type="button"
                        onClick={toggleVoiceInput}
                        disabled={isLoading || isUploading}
                        className={`p-2 rounded-full ${
                          isListening 
                            ? 'text-red-500 animate-pulse' 
                            : darkMode 
                              ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-600'
                        }`}
                        title={isListening ? "Stop listening" : "Voice input"}
                      >
                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        disabled={isLoading || isUploading}
                        className={`p-2 rounded-full ${
                          darkMode 
                            ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                            : 'hover:bg-gray-100 text-gray-500 hover:text-gray-600'
                        }`}
                        title="Upload file"
                      >
                        <Upload size={20} />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                        disabled={isLoading || isUploading}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading || isUploading}
                    className={`p-3 rounded-lg flex items-center justify-center transition-all ${
                      inputMessage.trim() && !isLoading && !isUploading
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
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
                  darkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
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
                className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md font-medium"
              >
                <Plus size={20} />
                New Conversation
              </button>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md px-4">
                <motion.div 
                  whileHover={{ y: -2 }}
                  className={`p-4 rounded-lg transition-all ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlignLeft size={18} className={darkMode ? 'text-blue-400' : 'text-blue-600'} />
                    <h3 className="font-medium">Language Practice</h3>
                  </div>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Improve your conversation skills with AI-powered practice
                  </p>
                </motion.div>
                <motion.div 
                  whileHover={{ y: -2 }}
                  className={`p-4 rounded-lg transition-all ${
                    darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={18} className={darkMode ? 'text-purple-400' : 'text-purple-600'} />
                    <h3 className="font-medium">Document Translation</h3>
                  </div>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Upload files and get translations with explanations
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </SignedIn>
    </div>
  );
}

export default App;
