import React, { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, Send, MessageSquare, Trash2, Download, Copy, Upload, Plus, Sparkles, Settings, RefreshCw, BookOpen, Star, Cpu, Menu, X, ChevronDown, Search, Edit2, MoreVertical, Zap, Bot, User, FileText, Image, Code, Link2, Smile, Moon, Sun, Globe, Brain } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { SignedIn, SignedOut, SignIn, UserButton, useAuth, ClerkProvider } from '@clerk/clerk-react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useSpring, animated } from '@react-spring/web';
import { useTheme } from 'next-themes';

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
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="absolute right-0 top-0 bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-3 z-10 border border-gray-200 dark:border-zinc-700"
  >
    <p className="text-sm mb-2 dark:text-zinc-100">{message}</p>
    <div className="flex gap-2 justify-end">
      <button
        onClick={onCancel}
        className="px-3 py-1 text-sm bg-gray-100 dark:bg-zinc-700 rounded hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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

const formatTime = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
};

const MessageBubble: React.FC<{ message: Message; darkMode: boolean }> = ({ message, darkMode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const controls = useAnimation();
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" }
      });
    }
  }, [inView, controls]);

  const springProps = useSpring({
    scale: isHovered ? 1.02 : 1,
    config: { tension: 300, friction: 10 }
  });

  return (
    <animated.div
      ref={ref}
      style={springProps}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative max-w-[90%] md:max-w-3xl rounded-2xl p-4 ${
        message.sender === 'user'
          ? darkMode
            ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white'
            : 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 text-white'
          : darkMode
          ? 'bg-gradient-to-r from-zinc-800 via-zinc-900 to-zinc-800 text-zinc-100'
          : 'bg-white text-gray-800 border border-gray-200'
      } shadow-lg backdrop-blur-sm`}
    >
      <div className="absolute -left-2 top-4">
        {message.sender === 'user' ? (
          <div className="p-1 rounded-full bg-blue-500">
            <User size={24} className="text-white" />
          </div>
        ) : (
          <div className="p-1 rounded-full bg-purple-500">
            <Bot size={24} className="text-white" />
          </div>
        )}
      </div>
      
      {message.fileInfo && (
        <div className={`text-xs mb-2 p-2 rounded-lg ${
          darkMode ? 'bg-zinc-700/50' : 'bg-gray-100/50'
        } backdrop-blur-sm border border-white/10`}>
          <div className="flex items-center gap-2">
            <FileText size={16} className={darkMode ? 'text-blue-400' : 'text-blue-500'} />
            <span className="font-medium">{message.fileInfo.name}</span>
            <span className="opacity-70">({(message.fileInfo.size / 1024).toFixed(1)} KB)</span>
          </div>
        </div>
      )}
      
      <div className="whitespace-pre-wrap pl-6">
        {message.content}
      </div>
      
      <div className={`absolute text-xs ${
        message.sender === 'user'
          ? darkMode
            ? 'text-blue-300'
            : 'text-blue-100'
          : darkMode
          ? 'text-zinc-500'
          : 'text-gray-500'
      } bottom-1 right-2`}>
        {formatTime(message.timestamp)}
      </div>
    </animated.div>
  );
};

const FloatingActionButton: React.FC<{ onClick: () => void; icon: React.ReactNode; color?: string }> = ({ onClick, icon, color = 'blue' }) => {
  const [isHovered, setIsHovered] = useState(false);
  const springProps = useSpring({
    scale: isHovered ? 1.1 : 1,
    config: { tension: 300, friction: 10 }
  });

  return (
    <animated.button
      style={springProps}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      className={`fixed bottom-24 right-6 p-4 bg-gradient-to-r from-${color}-600 to-${color}-500 text-white rounded-full shadow-lg hover:from-${color}-700 hover:to-${color}-600 transition-colors z-50 backdrop-blur-sm border border-white/10`}
    >
      {icon}
    </animated.button>
  );
};

// Initialize Clerk
const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

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
  const [darkMode, setDarkMode] = useState(true);
  const [favoriteChats, setFavoriteChats] = useState<string[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [showChatOptions, setShowChatOptions] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState('');
  const [showWelcomeAnimation, setShowWelcomeAnimation] = useState(true);

  const typingAnimation = useAnimation();
  const welcomeAnimation = useAnimation();

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

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleTitleEdit = () => {
    if (currentChat) {
      setEditingTitle(currentChat.title);
      setIsEditingTitle(true);
    }
  };

  const saveTitleEdit = () => {
    if (currentChat && editingTitle.trim()) {
      renameChat(currentChat.id, editingTitle.trim());
    }
    setIsEditingTitle(false);
  };

  useEffect(() => {
    if (showWelcomeAnimation) {
      welcomeAnimation.start({
        opacity: [0, 1, 1, 0],
        scale: [0.8, 1, 1, 1.2],
        transition: {
          duration: 2,
          times: [0, 0.2, 0.8, 1]
        }
      });
      setTimeout(() => setShowWelcomeAnimation(false), 2000);
    }
  }, [showWelcomeAnimation]);

  useEffect(() => {
    if (isTyping) {
      const dots = ['.', '..', '...'];
      let currentDot = 0;
      const interval = setInterval(() => {
        setTypingIndicator(dots[currentDot]);
        currentDot = (currentDot + 1) % dots.length;
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isTyping]);

  return (
    <ClerkProvider publishableKey={clerkPubKey || ''}>
      <div className={`flex h-screen ${darkMode ? 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100' : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900'}`}>
        <AnimatePresence>
          {showWelcomeAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={welcomeAnimation}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900 z-50"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl" />
                  <Cpu size={64} className="text-blue-400 mx-auto mb-4 relative z-10" />
                </motion.div>
                <h1 className="text-4xl font-bold text-white mb-2">Welcome to Trainify</h1>
                <p className="text-blue-100">Your AI-powered language training assistant</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <SignedOut>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900"
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="p-8 rounded-2xl shadow-2xl w-full max-w-md mx-4 backdrop-blur-sm bg-black/20 border border-white/10"
            >
              <div className="flex items-center justify-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl" />
                  <Cpu size={32} className="text-blue-400 mr-2 relative z-10" />
                </motion.div>
                <h2 className="text-3xl font-bold text-white">Trainify.ai</h2>
              </div>
              <p className="text-center mb-6 text-blue-100">Your AI-powered language training assistant</p>
              <SignIn
                routing="hash"
                signUpUrl="/sign-up"
                afterSignInUrl="/"
              />
            </motion.div>
          </motion.div>
        </SignedOut>

        <SignedIn>
          {/* Mobile header */}
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`md:hidden fixed top-0 left-0 right-0 z-30 p-3 flex justify-between items-center ${
              darkMode ? 'bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800' : 'bg-white/80 backdrop-blur-sm border-b border-gray-200'
            }`}
          >
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
            >
              {showMobileMenu ? (
                <X size={20} className={darkMode ? 'text-zinc-300' : 'text-gray-700'} />
              ) : (
                <Menu size={20} className={darkMode ? 'text-zinc-300' : 'text-gray-700'} />
              )}
            </button>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg" />
                <Cpu size={20} className="text-blue-500 relative z-10" />
              </div>
              <h1 className="font-bold">Trainify.ai</h1>
            </div>
            
            <div className="w-8">
              <UserButton afterSignOutUrl="/" />
            </div>
          </motion.div>

          {/* Mobile menu overlay */}
          <AnimatePresence>
            {showMobileMenu && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                onClick={() => setShowMobileMenu(false)}
              />
            )}
          </AnimatePresence>

          {/* Sidebar */}
          <motion.div 
            initial={{ x: -300 }}
            animate={{ x: showSidebar ? 0 : -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`fixed md:relative z-20 h-full ${
              showSidebar ? 'w-72' : 'w-0'
            } ${
              darkMode ? 'bg-zinc-900/80 backdrop-blur-sm border-zinc-800' : 'bg-white/80 backdrop-blur-sm border-gray-200'
            } border-r flex flex-col overflow-hidden`}
          >
            <div className={`p-4 border-b flex justify-between items-center ${
              darkMode ? 'border-zinc-800' : 'border-gray-200'
            } mt-12 md:mt-0`}>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-lg" />
                  <Cpu size={24} className="text-blue-500 relative z-10" />
                </div>
                <h1 className="font-bold text-xl">Trainify.ai</h1>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setDarkMode(!darkMode)} 
                  className={`p-2 rounded-full transition-colors ${
                    darkMode ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
                  }`}
                >
                  {darkMode ? (
                    <Sun size={20} className="text-yellow-400" />
                  ) : (
                    <Moon size={20} className="text-blue-500" />
                  )}
                </button>
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>

            <div className="p-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 rounded-lg text-sm ${
                    darkMode 
                      ? 'bg-zinc-800/50 text-zinc-100 placeholder-zinc-400 border border-zinc-700' 
                      : 'bg-gray-100/50 text-gray-900 placeholder-gray-500 border border-gray-200'
                  } backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createNewChat}
              className="m-4 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-colors font-medium shadow-lg"
            >
              <Plus size={20} />
              New Conversation
            </motion.button>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent pb-20 md:pb-0">
              {filteredChats.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-center p-8 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}
                >
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations found</p>
                </motion.div>
              ) : (
                Object.entries(groupedChats).map(([date, dateChats]) => (
                  <motion.div 
                    key={date}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className={`px-4 py-2 text-xs font-medium ${
                      darkMode ? 'text-zinc-500' : 'text-gray-500'
                    }`}>
                      {date}
                    </div>
                    
                    {dateChats.map(chat => (
                      <motion.div
                        key={chat.id}
                        whileHover={{ scale: 1.01 }}
                        className={`group flex items-center justify-between p-3 cursor-pointer transition-all duration-150 ${
                          currentChat?.id === chat.id 
                          ? (darkMode 
                              ? 'bg-zinc-800 border-l-4 border-blue-500' 
                              : 'bg-blue-50 border-l-4 border-blue-500')
                          : (darkMode
                              ? 'hover:bg-zinc-800' 
                              : 'hover:bg-gray-100')
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
                            <span className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                              {chat.language}
                            </span>
                            <span className={`text-xs ${darkMode ? 'text-zinc-600' : 'text-gray-400'}`}>•</span>
                            <span className={`text-xs ${
                              chat.modelType === 'advanced' 
                                ? 'text-purple-400' 
                                : (darkMode ? 'text-zinc-500' : 'text-gray-500')
                            }`}>
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
                            className={`${favoriteChats.includes(chat.id) ? '' : 'opacity-0 group-hover:opacity-100'} p-1 rounded transition-all ${
                              darkMode 
                                ? 'hover:bg-zinc-700' 
                                : 'hover:bg-gray-200'
                            } ${
                              favoriteChats.includes(chat.id) 
                                ? 'text-yellow-500' 
                                : 'hover:text-yellow-500'
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
                            className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                              darkMode 
                                ? 'hover:bg-zinc-700 hover:text-blue-400' 
                                : 'hover:bg-gray-200 hover:text-blue-600'
                            }`}
                            title="Duplicate chat"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowChatOptions(showChatOptions === chat.id ? null : chat.id);
                            }}
                            className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                              darkMode 
                                ? 'hover:bg-zinc-700' 
                                : 'hover:bg-gray-200'
                            }`}
                          >
                            <MoreVertical size={16} />
                          </button>
                          <AnimatePresence>
                            {showChatOptions === chat.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg z-10 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm({ id: chat.id, type: 'chat' });
                                    setShowChatOptions(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  Delete chat
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          <div className="flex-1 flex flex-col pt-12 md:pt-0">
            {currentChat ? (
              <>
                <motion.div 
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`p-4 border-b flex justify-between items-center ${
                    darkMode 
                      ? 'border-zinc-800 bg-zinc-900/80 backdrop-blur-sm' 
                      : 'border-gray-200 bg-white/80 backdrop-blur-sm'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setShowMobileMenu(!showMobileMenu)}
                      className="md:hidden p-1"
                    >
                      <Menu size={20} className={darkMode ? 'text-zinc-300' : 'text-gray-700'} />
                    </button>
                    <div className="flex items-center gap-2">
                      {isEditingTitle ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={saveTitleEdit}
                          onKeyDown={(e) => e.key === 'Enter' && saveTitleEdit()}
                          className={`text-lg font-semibold bg-transparent border-b ${
                            darkMode ? 'border-zinc-700' : 'border-gray-300'
                          } focus:outline-none focus:border-blue-500`}
                          autoFocus
                        />
                      ) : (
                        <>
                          <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles size={18} className="text-blue-500" />
                            {currentChat.title}
                          </h2>
                          <button
                            onClick={handleTitleEdit}
                            className="p-1 rounded-full hover:bg-zinc-800 transition-colors"
                          >
                            <Edit2 size={14} className={darkMode ? 'text-zinc-400' : 'text-gray-500'} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <button
                        onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 border text-sm ${
                          darkMode 
                            ? 'bg-zinc-800 text-zinc-100 border-zinc-700' 
                            : 'bg-white text-gray-800 border-gray-200'
                        }`}
                      >
                        {currentChat.language}
                        <ChevronDown size={16} />
                      </button>
                      <AnimatePresence>
                        {showLanguageDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`absolute right-0 mt-1 w-40 rounded-lg shadow-lg z-10 ${
                              darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-gray-200'
                            } border`}
                          >
                            {languages.map((lang) => (
                              <button
                                key={lang.value}
                                onClick={() => handleLanguageChange(lang.value)}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-500 hover:text-white ${
                                  darkMode ? 'hover:bg-blue-600' : 'hover:bg-blue-500'
                                } ${
                                  currentChat.language === lang.value 
                                    ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                                    : (darkMode ? 'text-zinc-100' : 'text-gray-800')
                                }`}
                              >
                                {lang.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <select
                      value={currentChat.modelType || 'standard'}
                      onChange={(e) => handleModelChange(e.target.value as 'standard' | 'advanced')}
                      className={`rounded-lg px-3 py-1.5 border text-sm focus:outline-none ${
                        darkMode 
                          ? 'bg-zinc-800 text-zinc-100 border-zinc-700' 
                          : 'bg-white text-gray-800 border-gray-200'
                      }`}
                      aria-label="Select model"
                    >
                      <option value="standard">Standard</option>
                      <option value="advanced">Advanced</option>
                    </select>
                    <button
                      onClick={downloadPDF}
                      className={`p-2 rounded-lg ${
                        darkMode 
                          ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300' 
                          : 'hover:bg-gray-100 text-gray-500 hover:text-gray-600'
                      }`}
                      title="Download chat as PDF"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </motion.div>

                <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">
                  {currentChat.messages.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center h-full text-center"
                    >
                      <div className={`p-6 rounded-full mb-4 ${
                        darkMode ? 'bg-zinc-800/50' : 'bg-gray-100/50'
                      } backdrop-blur-sm border border-white/10`}>
                        <MessageSquarePlus size={32} className={darkMode ? 'text-zinc-500' : 'text-gray-400'} />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Start a conversation</h3>
                      <p className={`max-w-md mb-6 ${
                        darkMode ? 'text-zinc-400' : 'text-gray-500'
                      }`}>
                        Ask questions, upload files, or practice your language skills with Trainify AI
                      </p>
                    </motion.div>
                  ) : (
                    <div className="space-y-6">
                      {currentChat.messages.map((message, index) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`group flex gap-3 ${
                            message.sender === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <MessageBubble message={message} darkMode={darkMode} />
                        </motion.div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`fixed bottom-0 left-0 right-0 md:relative p-4 border-t ${
                    darkMode ? 'border-zinc-800 bg-zinc-900/80 backdrop-blur-sm' : 'border-gray-200 bg-white/80 backdrop-blur-sm'
                  }`}
                >
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <div className="flex-1 relative">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`p-2 rounded-lg ${
                            darkMode 
                              ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300' 
                              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-600'
                          }`}
                        >
                          <Smile size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCodeEditor(!showCodeEditor)}
                          className={`p-2 rounded-lg ${
                            darkMode 
                              ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300' 
                              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-600'
                          }`}
                        >
                          <Code size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowImageUpload(!showImageUpload)}
                          className={`p-2 rounded-lg ${
                            darkMode 
                              ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300' 
                              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-600'
                          }`}
                        >
                          <Image size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowLinkInput(!showLinkInput)}
                          className={`p-2 rounded-lg ${
                            darkMode 
                              ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300' 
                              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-600'
                          }`}
                        >
                          <Link2 size={20} />
                        </button>
                      </div>
                      
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type your message..."
                        className={`w-full rounded-lg py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          darkMode 
                            ? 'bg-zinc-800/50 text-white placeholder-zinc-400 border border-zinc-700' 
                            : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-200'
                        } backdrop-blur-sm`}
                        disabled={isLoading || isUploading}
                      />
                      
                      <div className="absolute right-2 top-2 flex gap-1">
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          disabled={isLoading || isUploading}
                          className={`p-2 rounded-full ${
                            darkMode 
                              ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300' 
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
                          accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                          disabled={isLoading || isUploading}
                        />
                      </div>
                    </div>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      disabled={!inputMessage.trim() || isLoading || isUploading}
                      className={`p-3 rounded-lg flex items-center justify-center ${
                        inputMessage.trim() && !isLoading && !isUploading
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white'
                          : darkMode
                          ? 'bg-zinc-800 text-zinc-500'
                          : 'bg-gray-200 text-gray-500'
                      } transition-colors shadow-lg`}
                    >
                      {isLoading || isUploading ? (
                        <RefreshCw size={20} className="animate-spin" />
                      ) : (
                        <Send size={20} />
                      )}
                    </motion.button>
                  </form>
                  
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-xs mt-2 text-center ${
                        darkMode ? 'text-zinc-500' : 'text-gray-500'
                      }`}
                    >
                      Trainify is typing{typingIndicator}
                    </motion.div>
                  )}
                  
                  <div className={`text-xs mt-2 text-center ${
                    darkMode ? 'text-zinc-500' : 'text-gray-500'
                  }`}>
                    {isUploading ? 'Uploading file...' : 'Trainify may produce inaccurate information'}
                  </div>
                </motion.div>
              </>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col items-center justify-center pt-12 md:pt-0"
              >
                <div className={`p-6 rounded-full mb-6 ${
                  darkMode ? 'bg-zinc-800/50' : 'bg-gray-100/50'
                } backdrop-blur-sm border border-white/10`}>
                  <MessageSquare size={48} className={darkMode ? 'text-zinc-500' : 'text-gray-400'} />
                </div>
                <h2 className="text-2xl font-medium mb-2">No conversation selected</h2>
                <p className={`max-w-md text-center mb-6 px-4 ${
                  darkMode ? 'text-zinc-400' : 'text-gray-500'
                }`}>
                  Select an existing conversation from the sidebar or create a new one to get started
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={createNewChat}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 px-6 rounded-lg hover:from-blue-700 hover:to-blue-600 transition-colors font-medium shadow-lg"
                >
                  <Plus size={20} />
                  New Conversation
                </motion.button>
              </motion.div>
            )}
          </div>

          {/* Floating action buttons */}
          <FloatingActionButton
            onClick={createNewChat}
            icon={<Plus size={24} />}
            color="blue"
          />
          
          <FloatingActionButton
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            icon={<ChevronDown size={24} className="transform rotate-180" />}
            color="purple"
          />
        </SignedIn>
      </div>
    </ClerkProvider>
  );
}

export default App;
