import React, { useState, useRef } from 'react';
import { MessageSquarePlus, Send, MessageSquare, Trash2, Download, ChevronLeft, ChevronRight, Copy, Upload} from 'lucide-react';
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
}


interface DeleteConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
}


const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ onConfirm, onCancel, message }) => (
  <div className="absolute right-0 top-0 bg-zinc-700 rounded-lg shadow-lg p-3 z-10">
    <p className="text-sm mb-2">{message}</p>
    <div className="flex gap-2 justify-end">
      <button
        onClick={onCancel}
        className="px-3 py-1 text-sm bg-zinc-600 rounded hover:bg-zinc-500 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="px-3 py-1 text-sm bg-red-600 rounded hover:bg-red-500 transition-colors"
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
];


function App() {
  const { getToken } = useAuth(); // Get JWT token for API requests
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'chat' | 'message' } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `New Chat ${chats.length + 1}`,
      messages: [],
      createdAt: new Date(),
      language: 'Chinese'
    };
    setChats([newChat, ...chats]);
    setCurrentChat(newChat);
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
      language: chatToCopy.language
    };
    setChats([newChat, ...chats]);
    setCurrentChat(newChat);
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


  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentChat) return;


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


    try {
      const token = await getToken(); // Get Clerk JWT token
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Include token in headers
        },
        body: JSON.stringify({
          message: userMessage.content,
          language: currentChat.language || 'Chinese'
        })
      });


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
    } catch (error) {
      console.error('Error during chat:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: 'Sorry, something went wrong with the chat. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };


      updatedChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, errorMessage],
      };


      setChats(chats.map(chat => chat.id === currentChat.id ? updatedChat : chat));
      setCurrentChat(updatedChat);
    }
  };


  const deleteChat = (chatId: string) => {
    setChats(chats.filter(chat => chat.id !== chatId));
    if (currentChat?.id === chatId) {
      setCurrentChat(null);
    }
    setDeleteConfirm(null);
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
    currentChat.messages.forEach((message) => {
      const prefix = message.sender === 'user' ? 'You: ' : 'Bot: ';
      const text = `${prefix}${message.content}`;
      const lines = doc.splitTextToSize(text, 170);


      if (yPos + (lines.length * 7) > 280) {
        doc.addPage();
        yPos = 20;
      }


      doc.text(lines, 20, yPos);
      yPos += (lines.length * 7) + 5;
    });


    doc.save(`${currentChat.title}.pdf`);
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !currentChat) return;
   
    const file = e.target.files[0];
    if (!file) return;


    setIsUploading(true);
   
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetLanguage', currentChat.language || 'Chinese');


      const token = await getToken(); // Get Clerk JWT token
      const uploadResponse = await fetch('http://localhost:5000/api/translate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`, // Include token in headers
        },
        body: formData
      });


      const uploadData = await uploadResponse.json();


      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'File upload failed');
      }


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
    } catch (error) {
      console.error('Error uploading file:', error);
     
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: `❌ Error processing file: ${error}`,
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


  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      {/* Show SignIn when user is not authenticated */}
      <SignedOut>
        <div className="flex-1 flex items-center justify-center">
          <SignIn
            routing="hash"
            signUpUrl="/sign-up" // Optional: redirect to sign-up page
            afterSignInUrl="/"   // Redirect to root after sign-in
          />
        </div>
      </SignedOut>


      {/* Show chat UI when user is authenticated */}
      <SignedIn>
        {/* Sidebar Toggle */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute top-4 left-4 z-20 bg-zinc-700 p-2 rounded-full hover:bg-zinc-600 transition-colors"
        >
          {showSidebar ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>


        {/* Sidebar */}
        <div className={`${showSidebar ? 'w-64' : 'w-0'} bg-zinc-800 border-r border-zinc-700 flex flex-col transition-all duration-300 overflow-hidden`}>
          <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
            <button
              onClick={createNewChat}
              className="flex items-center justify-center gap-2 bg-zinc-700 text-zinc-100 py-2 px-4 rounded hover:bg-zinc-600 transition-colors"
            >
              <MessageSquarePlus size={20} />
              New Chat
            </button>
            <UserButton afterSignOutUrl="/" /> {/* Clerk UserButton for profile/logout */}
          </div>
          <div className="flex-1 overflow-y-auto">
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`group flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-700 ${currentChat?.id === chat.id ? 'bg-zinc-700' : ''}`}
                onClick={() => setCurrentChat(chat)}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-zinc-400" />
                  <span className="text-sm truncate">{chat.title}</span>
                </div>
                <div className="relative flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyChat(chat);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-blue-400 transition-opacity"
                    title="Copy chat"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ id: chat.id, type: 'chat' });
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                  {deleteConfirm?.id === chat.id && deleteConfirm.type === 'chat' && (
                    <DeleteConfirm
                      message="Delete this chat?"
                      onConfirm={() => deleteChat(chat.id)}
                      onCancel={() => setDeleteConfirm(null)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {currentChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-zinc-700 bg-zinc-800 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold">{currentChat.title}</h2>
                  <p className="text-sm text-zinc-400">Employee Buddy Assistant</p>
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={currentChat.language || 'Chinese'}
                    onChange={handleLanguageChange}
                    className="bg-zinc-700 text-zinc-100 rounded px-3 py-1 border-none focus:outline-none focus:ring-2 focus:ring-zinc-600"
                  >
                    {languages.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={downloadPDF}
                    className="flex items-center gap-2 px-3 py-1 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors"
                  >
                    <Download size={16} />
                    Download PDF
                  </button>
                </div>
              </div>


              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentChat.messages.map(message => (
                  <div
                    key={message.id}
                    className={`group flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex items-start gap-2 relative">
                      <div
                        className={`max-w-[70%] rounded p-3 whitespace-pre-wrap ${message.sender === 'user' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-100'}`}
                      >
                        {message.content}
                        {message.fileInfo && (
                          <div className="mt-2 text-xs text-zinc-400">
                            File: {message.fileInfo.name} ({Math.round(message.fileInfo.size / 1024)}KB)
                          </div>
                        )}
                        <button
                          onClick={() => copyMessageToClipboard(message.content, message.id)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 hover:text-blue-400 transition-opacity"
                          title="Copy message"
                        >
                          {copiedMessageId === message.id ? (
                            <span className="text-xs text-green-400">Copied!</span>
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setDeleteConfirm({ id: message.id, type: 'message' })}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity mt-2"
                        >
                          <Trash2 size={16} />
                        </button>
                        {deleteConfirm?.id === message.id && deleteConfirm.type === 'message' && (
                          <DeleteConfirm
                            message="Delete this message?"
                            onConfirm={() => deleteMessage(message.id)}
                            onCancel={() => setDeleteConfirm(null)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>


              {/* Input Area */}
              <form onSubmit={sendMessage} className="p-4 border-t border-zinc-700 bg-zinc-800">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 bg-zinc-700 text-zinc-100 rounded border-none focus:outline-none focus:ring-2 focus:ring-zinc-600 placeholder-zinc-400"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".txt,.pdf"
                  />
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className={`bg-zinc-700 p-2 rounded hover:bg-zinc-600 transition-colors ${isUploading ? 'opacity-50' : ''}`}
                    disabled={isUploading}
                    title="Upload file"
                  >
                    {isUploading ? '...' : <Upload size={20} />}
                  </button>
                  <button
                    type="submit"
                    className="bg-zinc-700 p-2 rounded hover:bg-zinc-600 transition-colors"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-400">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-4" />
                <p>Select a chat or create a new one to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </SignedIn>
    </div>
  );
}


export default App;
