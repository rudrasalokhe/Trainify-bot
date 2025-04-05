import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Send, Plus, Trash2, Copy, 
  Upload, ChevronDown, Settings, Moon, Sun,
  FileText, Sparkles, Languages, Zap, RefreshCw, 
  X, Menu, Bookmark, BookmarkCheck, Mic, Image, Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { 
  SignedIn, SignedOut, SignIn, SignUp, 
  UserButton, useAuth, useUser 
} from '@clerk/clerk-react';

// ========== TYPES ==========
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

// ========== CONSTANTS ==========
const API_BASE_URL = 'https://trainify-bot.onrender.com';

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

// ========== COMPONENTS ==========
const DeleteConfirm = ({ onConfirm, onCancel, message }: { 
  onConfirm: () => void; 
  onCancel: () => void; 
  message: string 
}) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="absolute right-0 top-0 bg-gray-900/90 backdrop-blur-lg rounded-xl shadow-xl p-3 z-10 border border-gray-800"
  >
    <p className="text-sm mb-2 text-gray-300">{message}</p>
    <div className="flex gap-2 justify-end">
      <button
        onClick={onCancel}
        className="px-3 py-1 text-sm bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
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

// ========== MAIN APP ==========
export default function App() {
  // Clerk Auth
  const { getToken, userId } = useAuth();
  const { user } = useUser();

  // State
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 1024);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'chat' | 'message' } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [favoriteChats, setFavoriteChats] = useState<string[]>([]);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chats from localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem(`trainify-chats-${userId}`);
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
    
    const savedFavorites = localStorage.getItem(`trainify-favorites-${userId}`);
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
  }, [userId]);

  // Save chats to localStorage
  useEffect(() => {
    localStorage.setItem(`trainify-chats-${userId}`, JSON.stringify(chats));
  }, [chats, userId]);
  
  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem(`trainify-favorites-${userId}`, JSON.stringify(favoriteChats));
  }, [favoriteChats, userId]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  // Create new chat
  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `New Chat`,
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

  // Rename chat
  const renameChat = (chatId: string, newTitle: string) => {
    const updatedChats = chats.map(chat => 
      chat.id === chatId ? { ...chat, title: newTitle } : chat
    );
    setChats(updatedChats);
    
    if (currentChat?.id === chatId) {
      setCurrentChat({ ...currentChat, title: newTitle });
    }
  };

  // Toggle favorite
  const toggleFavorite = (chatId: string) => {
    if (favoriteChats.includes(chatId)) {
      setFavoriteChats(favoriteChats.filter(id => id !== chatId));
    } else {
      setFavoriteChats([...favoriteChats, chatId]);
    }
  };

  // Send message
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
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'bot',
        timestamp: new Date(),
      };

      updatedChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, botMessage],
      };

      setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
      setCurrentChat(updatedChat);
      
      if (updatedChat.messages.length === 2 && updatedChat.title === 'New Chat') {
        let title = userMessage.content.substring(0, 30);
        if (userMessage.content.length > 30) title += '...';
        renameChat(updatedChat.id, title);
      }
    } catch (error) {
      console.error('Error during chat:', error);
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
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Delete chat
  const deleteChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (currentChat?.id === chatId) setCurrentChat(null);
    setDeleteConfirm(null);
    if (favoriteChats.includes(chatId)) {
      setFavoriteChats(favoriteChats.filter(id => id !== chatId));
    }
  };

  // Delete message
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

  // Format time
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle file upload
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
      
      if (updatedChat.messages.length === 2 && updatedChat.title === 'New Chat') {
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

  // ========== RENDER ==========
  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <SignedOut>
        <div className="flex-1 flex items-center justify-center bg-gray-900">
          <div className="p-8 rounded-xl w-full max-w-md mx-4 bg-gray-800 border border-gray-700 shadow-lg">
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="p-3 rounded-full bg-gray-700 mb-4">
                <MessageSquare size={32} className="text-indigo-500" />
              </div>
              <h2 className="text-3xl font-bold text-center text-white mb-2">Trainify.ai</h2>
              <p className="text-center text-gray-400">Your AI language assistant</p>
            </div>
            <SignIn 
              routing="hash"
              appearance={{
                elements: {
                  card: 'bg-transparent shadow-none border-0',
                  headerTitle: 'text-white',
                  headerSubtitle: 'text-gray-400',
                  socialButtonsBlockButton: 'border-gray-700 hover:bg-gray-700',
                  formFieldInput: 'bg-gray-700 border-gray-600 text-white',
                  footerActionText: 'text-gray-400',
                  footerActionLink: 'text-indigo-400 hover:text-indigo-300',
                }
              }}
            />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {/* Mobile Header */}
        <div className={`lg:hidden fixed top-0 left-0 right-0 z-40 p-3 flex justify-between items-center ${
          darkMode ? 'bg-gray-900 border-b border-gray-800' : 'bg-white border-b border-gray-200'
        }`}>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 rounded-lg hover:bg-gray-800/50"
          >
            {showMobileMenu ? (
              <X size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
            ) : (
              <Menu size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
            )}
          </button>
          <h1 className="font-bold text-lg text-indigo-500">Trainify</h1>
          <UserButton afterSignOutUrl="/" />
        </div>

        {/* Sidebar */}
        <motion.div 
          className={`fixed lg:relative z-30 h-full transition-all ${
            showMobileMenu ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 ${
            showSidebar ? 'w-72' : 'w-0'
          } ${
            darkMode ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r border-gray-200'
          }`}
          initial={{ x: '-100%' }}
          animate={{ x: showMobileMenu || showSidebar ? 0 : '-100%' }}
        >
          <div className="p-4 border-b border-gray-800 flex justify-between items-center mt-12 lg:mt-0">
            <h1 className="font-bold text-xl text-indigo-500">Trainify</h1>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-gray-800"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <motion.button
            onClick={createNewChat}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mx-4 my-3 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 px-4 rounded-lg hover:bg-indigo-500 transition-colors"
          >
            <Plus size={18} />
            New Chat
          </motion.button>

          <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
            {chats.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              chats.map(chat => (
                <motion.div
                  key={chat.id}
                  whileHover={{ backgroundColor: darkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.5)' }}
                  className={`p-3 mx-2 rounded-lg cursor-pointer ${
                    currentChat?.id === chat.id 
                      ? darkMode ? 'bg-gray-800' : 'bg-gray-100'
                      : ''
                  }`}
                  onClick={() => {
                    setCurrentChat(chat);
                    setShowMobileMenu(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{chat.title}</p>
                    {favoriteChats.includes(chat.id) && (
                      <BookmarkCheck size={14} className="text-indigo-500 fill-indigo-500/20" />
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col pt-12 lg:pt-0">
          {currentChat ? (
            <>
              <div className={`p-4 border-b ${
                darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
              }`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{currentChat.title}</h2>
                  <div className="flex items-center gap-2">
                    <button className="text-sm px-2 py-1 rounded-lg bg-gray-800 text-gray-300">
                      {currentChat.language}
                    </button>
                    <button className="text-sm px-2 py-1 rounded-lg bg-indigo-600 text-white">
                      {currentChat.modelType === 'advanced' ? 'Advanced' : 'Standard'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {currentChat.messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mb-4 flex ${
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.sender === 'user'
                        ? darkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white'
                        : darkMode ? 'bg-gray-800' : 'bg-gray-100'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'user' 
                          ? 'text-indigo-200' 
                          : darkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className={`p-4 border-t ${
                darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
              }`}>
                <form onSubmit={sendMessage} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type a message..."
                      className={`w-full rounded-lg py-2.5 px-4 focus:outline-none ${
                        darkMode 
                          ? 'bg-gray-800 text-white placeholder-gray-500 border-gray-700' 
                          : 'bg-gray-100 text-gray-900 placeholder-gray-400 border-gray-200'
                      } border`}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute right-2 top-2 text-gray-500 hover:text-indigo-500"
                    >
                      <Upload size={18} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className={`p-2.5 rounded-lg ${
                      inputMessage.trim() 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                        : darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="p-4 rounded-full bg-gray-800 mb-4">
                <MessageSquare size={32} className="text-indigo-500" />
              </div>
              <h2 className="text-xl font-medium mb-2">No conversation selected</h2>
              <p className="text-gray-500 mb-6">Select a chat or start a new one</p>
              <button
                onClick={createNewChat}
                className="flex items-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-500"
              >
                <Plus size={16} />
                New Chat
              </button>
            </div>
          )}
        </div>
      </SignedIn>
    </div>
  );
}
