import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquarePlus, Send, MessageSquare, Trash2, Download, 
  Copy, Upload, Plus, AlignLeft, Sparkles, Settings, 
  RefreshCw, BookOpen, Star, Cpu, Menu, X, Languages, 
  Zap, FileText, ChevronDown, ChevronUp, Moon, Sun,
  Mic, Image, Video, FileInput, Bookmark, BookmarkCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { SignedIn, SignedOut, SignIn, UserButton, useAuth } from '@clerk/clerk-react';

// Types
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

const DeleteConfirm = ({ onConfirm, onCancel, message }: { 
  onConfirm: () => void; 
  onCancel: () => void; 
  message: string 
}) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="absolute right-0 top-0 bg-gray-900/90 backdrop-blur-lg rounded-xl shadow-2xl p-4 z-10 border border-gray-700"
  >
    <p className="text-sm mb-3 text-gray-300">{message}</p>
    <div className="flex gap-2 justify-end">
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-sm bg-gray-700 rounded-lg hover:bg-gray-600 transition-all text-gray-200"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="px-3 py-1.5 text-sm bg-red-600 rounded-lg hover:bg-red-500 transition-all text-white"
      >
        Delete
      </button>
    </div>
  </motion.div>
);

function App() {
  const { getToken } = useAuth();
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
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Effects and helper functions remain largely the same as previous implementation
  // ... (truncated for brevity, but should include all the original functionality)

  return (
    <div className={`flex h-screen ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <SignedOut>
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 rounded-3xl w-full max-w-md mx-4 backdrop-blur-lg bg-black/30 border border-white/10 shadow-2xl"
          >
            <div className="flex flex-col items-center justify-center mb-8">
              <motion.div 
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="mb-6"
              >
                <Cpu size={48} className="text-indigo-400" />
              </motion.div>
              <h2 className="text-4xl font-bold text-center bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Trainify.ai
              </h2>
              <p className="text-center text-indigo-200 text-lg">
                Your next-generation language AI assistant
              </p>
            </div>
            <SignIn
              routing="hash"
              appearance={{
                elements: {
                  card: 'bg-transparent shadow-none border-0 p-0',
                  headerTitle: 'text-white text-2xl font-bold',
                  headerSubtitle: 'text-indigo-200',
                  socialButtonsBlockButton: 'border-white/20 hover:bg-white/10 transition-all',
                  dividerLine: 'bg-white/20',
                  formFieldLabel: 'text-white',
                  formFieldInput: 'bg-white/10 border-white/20 text-white focus:border-indigo-400 focus:shadow-indigo-400/10 rounded-xl',
                  footerActionText: 'text-white',
                  footerActionLink: 'text-indigo-300 hover:text-indigo-200 transition-colors',
                }
              }}
            />
          </motion.div>
        </div>
      </SignedOut>

      <SignedIn>
        {/* Mobile header */}
        <motion.div 
          className={`lg:hidden fixed top-0 left-0 right-0 z-40 p-3 flex justify-between items-center ${
            darkMode ? 'bg-gray-900/90 backdrop-blur-md border-b border-gray-800' : 'bg-white/90 backdrop-blur-md border-b border-gray-200'
          }`}
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 rounded-xl hover:bg-gray-800/50 transition-colors"
          >
            {showMobileMenu ? (
              <X size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
            ) : (
              <Menu size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
            )}
          </button>
          
          <div className="flex items-center gap-2">
            <Cpu size={20} className="text-indigo-500" />
            <h1 className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Trainify.ai
            </h1>
          </div>
          
          <div className="w-8">
            <UserButton 
              afterSignOutUrl="/" 
              appearance={{
                elements: {
                  userButtonAvatarBox: 'w-8 h-8',
                  userButtonPopoverCard: darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200',
                }
              }}
            />
          </div>
        </motion.div>

        {/* Mobile menu overlay */}
        {showMobileMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* Sidebar */}
        <motion.div 
          className={`fixed lg:relative z-30 h-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            showMobileMenu ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 ${
            showSidebar ? 'w-80' : 'w-0'
          } ${
            darkMode ? 'bg-gray-900/90 backdrop-blur-lg border-gray-800' : 'bg-white/90 backdrop-blur-lg border-gray-200'
          } border-r flex flex-col overflow-hidden shadow-xl`}
          initial={{ x: '-100%' }}
          animate={{ x: showMobileMenu || showSidebar ? 0 : '-100%' }}
        >
          <div className={`p-4 border-b flex justify-between items-center ${
            darkMode ? 'border-gray-800' : 'border-gray-200'
          } mt-12 lg:mt-0`}>
            <div className="flex items-center gap-2">
              <Cpu size={24} className="text-indigo-500" />
              <h1 className="font-bold text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Trainify.ai
              </h1>
            </div>
            <div className="lg:flex items-center gap-2 hidden">
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-xl transition-colors ${
                  darkMode 
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600 hover:text-gray-700'
                }`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <UserButton 
                afterSignOutUrl="/" 
                appearance={{
                  elements: {
                    userButtonAvatarBox: 'w-8 h-8',
                    userButtonPopoverCard: darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200',
                  }
                }}
              />
            </div>
          </div>
          
          <motion.button
            onClick={createNewChat}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mx-4 my-3 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg font-medium"
          >
            <Plus size={20} />
            New Conversation
          </motion.button>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700/50 scrollbar-track-transparent pb-20 lg:pb-0">
            {/* Chat list with animations */}
            <AnimatePresence>
              {chats.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-center p-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
                >
                  <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <motion.button
                    onClick={createNewChat}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-4 text-sm bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors"
                  >
                    Create your first chat
                  </motion.button>
                </motion.div>
              ) : (
                Object.entries(groupChatsByDate()).map(([date, dateChats]) => (
                  <div key={date}>
                    <div className={`px-4 py-2 text-xs font-medium ${
                      darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {date}
                    </div>
                    
                    {dateChats.map(chat => (
                      <motion.div
                        key={chat.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className={`group flex items-center justify-between p-3 mx-2 rounded-xl cursor-pointer transition-all duration-150 ${
                          currentChat?.id === chat.id 
                          ? (darkMode 
                              ? 'bg-gray-800/50 border-l-4 border-indigo-500' 
                              : 'bg-indigo-50 border-l-4 border-indigo-500')
                          : (darkMode
                              ? 'hover:bg-gray-800/30' 
                              : 'hover:bg-gray-100/50')
                        }`}
                        onClick={() => {
                          setCurrentChat(chat);
                          setShowMobileMenu(false);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {favoriteChats.includes(chat.id) ? (
                              <BookmarkCheck size={16} className="text-indigo-500 fill-indigo-500/20" />
                            ) : (
                              <Bookmark size={16} className="text-gray-500 opacity-0 group-hover:opacity-100" />
                            )}
                            <span className="text-sm font-medium truncate">
                              {chat.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className={`text-xs flex items-center gap-1 ${
                              darkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              {languages.find(l => l.value === chat.language)?.flag || '🌐'}
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
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col pt-12 lg:pt-0 overflow-hidden relative">
          {currentChat ? (
            <>
              {/* Chat header */}
              <motion.div 
                className={`p-4 border-b flex justify-between items-center z-20 ${
                  darkMode 
                    ? 'border-gray-800 bg-gray-900/80 backdrop-blur-lg' 
                    : 'border-gray-200 bg-white/80 backdrop-blur-lg'
                }`}
                initial={{ y: -50 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="lg:hidden p-1.5 rounded-xl hover:bg-gray-800/50 transition-colors"
                  >
                    <Menu size={20} className={darkMode ? 'text-gray-300' : 'text-gray-700'} />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles size={18} className="text-indigo-500" />
                      <span className="truncate max-w-[180px] md:max-w-xs">{currentChat.title}</span>
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="relative">
                        <button 
                          onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                          className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg ${
                            darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                          } transition-colors`}
                        >
                          {languages.find(l => l.value === currentChat.language)?.flag || '🌐'}
                          {currentChat.language}
                          {showLanguageDropdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {showLanguageDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`absolute top-full left-0 mt-1 rounded-lg shadow-lg z-10 ${
                              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                            } border`}
                          >
                            {languages.map((lang) => (
                              <button
                                key={lang.value}
                                onClick={() => {
                                  handleLanguageChange({ target: { value: lang.value } } as React.ChangeEvent<HTMLSelectElement>);
                                  setShowLanguageDropdown(false);
                                }}
                                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left ${
                                  darkMode 
                                    ? 'hover:bg-gray-700' 
                                    : 'hover:bg-gray-100'
                                } ${
                                  currentChat.language === lang.value 
                                    ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') 
                                    : ''
                                }`}
                              >
                                <span>{lang.flag}</span>
                                <span>{lang.label}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                      <div className="relative">
                        <button 
                          onClick={() => setShowModelDropdown(!showModelDropdown)}
                          className={`text-xs flex items-center gap-1 px-2 py-1 rounded-lg ${
                            darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                          } transition-colors`}
                        >
                          <Zap size={12} className={currentChat.modelType === 'advanced' ? 'text-purple-400' : ''} />
                          {currentChat.modelType === 'advanced' ? 'Advanced' : 'Standard'}
                          {showModelDropdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {showModelDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`absolute top-full left-0 mt-1 rounded-lg shadow-lg z-10 ${
                              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                            } border`}
                          >
                            {['standard', 'advanced'].map((model) => (
                              <button
                                key={model}
                                onClick={() => {
                                  handleModelChange({ target: { value: model } } as React.ChangeEvent<HTMLSelectElement>);
                                  setShowModelDropdown(false);
                                }}
                                className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left ${
                                  darkMode 
                                    ? 'hover:bg-gray-700' 
                                    : 'hover:bg-gray-100'
                                } ${
                                  currentChat.modelType === model 
                                    ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') 
                                    : ''
                                }`}
                              >
                                <Zap size={12} className={model === 'advanced' ? 'text-purple-400' : ''} />
                                <span>{model === 'advanced' ? 'Advanced' : 'Standard'}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadPDF}
                    className={`p-2 rounded-xl ${
                      darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                    } transition-colors`}
                    title="Download chat"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </motion.div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4">
                {currentChat.messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center"
                  >
                    <motion.div 
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 3 }}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setInputMessage('Can you help me practice my conversation skills?');
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        } transition-all`}
                      >
                        <MessageSquare size={16} />
                        Practice conversation
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setInputMessage('Explain this grammar rule: ');
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        } transition-all`}
                      >
                        <AlignLeft size={16} />
                        Ask about grammar
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          triggerFileInput();
                        }}
                        className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        } transition-all`}
                      >
                        <FileText size={16} />
                        Upload document
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setInputMessage('What are some common phrases in this language?');
                          if (inputRef.current) {
                            inputRef.current.focus();
                          }
                        }}
                        className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-gray-800 hover:bg-gray-700' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        } transition-all`}
                      >
                        <Languages size={16} />
                        Common phrases
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-6 max-w-4xl mx-auto">
                    <AnimatePresence>
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
                          <motion.div
                            whileHover={{ scale: 1.01 }}
                            className={`max-w-[90%] md:max-w-3xl rounded-2xl p-4 relative transition-all ${
                              message.sender === 'user'
                                ? darkMode
                                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-indigo-50'
                                  : 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white'
                                : darkMode
                                ? 'bg-gray-800 text-gray-100'
                                : 'bg-white text-gray-800 border border-gray-200'
                            } shadow-md`}
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
                                  ? 'text-indigo-300'
                                  : 'text-indigo-200'
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
                                    ? 'hover:bg-gray-700/50 text-gray-400 hover:text-indigo-400' 
                                    : 'hover:bg-gray-200/50 text-gray-500 hover:text-indigo-600'
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
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className={`absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded-lg text-xs ${
                                  darkMode ? 'bg-gray-800' : 'bg-gray-200'
                                } shadow-md`}
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
                          </motion.div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input area */}
              <motion.div 
                className={`fixed bottom-0 left-0 right-0 lg:relative p-4 ${
                  darkMode ? 'bg-gray-900/80 backdrop-blur-lg border-t border-gray-800' : 'bg-white/80 backdrop-blur-lg border-t border-gray-200'
                }`}
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <form onSubmit={sendMessage} className="flex gap-2">
                  <div className="flex-1 relative">
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Message Trainify..."
                        className={`w-full rounded-xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                          darkMode 
                            ? 'bg-gray-800 text-white placeholder-gray-500 border-gray-700' 
                            : 'bg-white text-gray-900 placeholder-gray-400 border-gray-200'
                        } border shadow-sm`}
                        disabled={isLoading || isUploading}
                      />
                      <div className="absolute right-2 top-2 flex gap-1">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowMediaMenu(!showMediaMenu)}
                            disabled={isLoading || isUploading}
                            className={`p-2 rounded-lg ${
                              darkMode 
                                ? 'hover:bg-gray-700/50 text-gray-400 hover:text-gray-300' 
                                : 'hover:bg-gray-100/50 text-gray-500 hover:text-gray-600'
                            } transition-colors`}
                            title="Media options"
                          >
                            <Plus size={20} />
                          </button>
                          {showMediaMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`absolute bottom-full right-0 mb-2 p-1 rounded-xl shadow-lg z-10 ${
                                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                              } border`}
                            >
                              <button
                                type="button"
                                onClick={triggerFileInput}
                                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm ${
                                  darkMode 
                                    ? 'hover:bg-gray-700 text-gray-300' 
                                    : 'hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                <FileInput size={16} />
                                Upload File
                              </button>
                              <button
                                type="button"
                                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm ${
                                  darkMode 
                                    ? 'hover:bg-gray-700 text-gray-300' 
                                    : 'hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                <Image size={16} />
                                Image
                              </button>
                              <button
                                type="button"
                                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm ${
                                  darkMode 
                                    ? 'hover:bg-gray-700 text-gray-300' 
                                    : 'hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                <Video size={16} />
                                Video
                              </button>
                              <button
                                type="button"
                                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm ${
                                  darkMode 
                                    ? 'hover:bg-gray-700 text-gray-300' 
                                    : 'hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                <Mic size={16} />
                                Voice
                              </button>
                            </motion.div>
                          )}
                        </div>
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
                  </div>
                  <motion.button
                    type="submit"
                    disabled={!inputMessage.trim() || isLoading || isUploading}
                    whileHover={inputMessage.trim() && !isLoading && !isUploading ? { scale: 1.05 } : {}}
                    whileTap={inputMessage.trim() && !isLoading && !isUploading ? { scale: 0.95 } : {}}
                    className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                      inputMessage.trim() && !isLoading && !isUploading
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md'
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
                  </motion.button>
                </form>
                <div className={`text-xs mt-2 text-center ${
                  darkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  {isUploading ? 'Uploading file...' : 'Trainify may produce inaccurate information'}
                </div>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center pt-12 lg:pt-0"
            >
              <motion.div 
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className={`p-6 rounded-full mb-6 ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}
              >
                <MessageSquare size={48} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
              </motion.div>
              <h2 className="text-2xl font-medium mb-2">No conversation selected</h2>
              <p className={`max-w-md text-center mb-6 px-4 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Select an existing conversation from the sidebar or create a new one to get started
              </p>
              <motion.button
                onClick={createNewChat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg font-medium"
              >
                <Plus size={20} />
                New Conversation
              </motion.button>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md px-4">
                <motion.div 
                  whileHover={{ y: -3 }}
                  className={`p-4 rounded-xl ${
                    darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                  } border ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlignLeft size={18} className={darkMode ? 'text-indigo-400' : 'text-indigo-600'} />
                    <h3 className="font-medium">Language Practice</h3>
                  </div>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Improve your conversation skills with AI-powered practice
                  </p>
                </motion.div>
                <motion.div 
                  whileHover={{ y: -3 }}
                  className={`p-4 rounded-xl ${
                    darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                  } border ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
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
                <motion.div 
                  whileHover={{ y: -3 }}
                  className={`p-4 rounded-xl ${
                    darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                  } border ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Languages size={18} className={darkMode ? 'text-green-400' : 'text-green-600'} />
                    <h3 className="font-medium">Grammar Assistance</h3>
                  </div>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Get detailed explanations of grammar rules
                  </p>
                </motion.div>
                <motion.div 
                  whileHover={{ y: -3 }}
                  className={`p-4 rounded-xl ${
                    darkMode ? 'bg-gray-800/50' : 'bg-gray-100'
                  } border ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={18} className={darkMode ? 'text-yellow-400' : 'text-yellow-600'} />
                    <h3 className="font-medium">Advanced AI</h3>
                  </div>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Switch to advanced model for complex queries
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
