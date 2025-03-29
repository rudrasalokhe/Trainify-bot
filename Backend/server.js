require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const Groq = require('groq-sdk');




const app = express();
const PORT = process.env.PORT || 5000;




// Configure file upload
const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are allowed'));
    }
  }
});




// Initialize GROQ SDK
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});




// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




// Create uploads directory if it doesn't exist
async function ensureUploadsDir() {
  try {
    await fs.mkdir('uploads', { recursive: true });
    console.log('Uploads directory ready');
  } catch (err) {
    console.error('Error creating uploads directory:', err);
    process.exit(1);
  }
}




// Language prompts
const languagePrompts = {
  Chinese: "用中文回答，保持专业且自然的语气",
  English: "Respond in English, maintaining a professional and natural tone",
  Spanish: "Responde en español, manteniendo un tono profesional y natural",
  French: "Répondez en français, en maintenant un ton professionnel et naturel",
  German: "Antworten Sie auf Deutsch und behalten Sie einen professionellen und natürlichen Ton bei",
  Japanese: "日本語で回答し、専門的で自然な口調を保つ",
  Korean: "한국어로 답변하고 전문적이고 자연스러운 어조를 유지하세요",
  Russian: "Отвечайте на русском языке, сохраняя профессиональный и естественный тон"
};




// Process uploaded file
async function processUploadedFile(filePath, originalName) {
  try {
    const ext = path.extname(originalName).toLowerCase();
    const data = await fs.readFile(filePath);
   
    if (ext === '.pdf') {
      const pdfData = await pdfParse(data);
      if (!pdfData.text || pdfData.text.trim().length === 0) {
        throw new Error('PDF contains no readable text');
      }
      return pdfData.text;
    } else if (ext === '.txt') {
      const text = data.toString('utf8');
      if (text.trim().length === 0) {
        throw new Error('Text file is empty');
      }
      return text;
    }
    throw new Error('Unsupported file type');
  } catch (err) {
    console.error('File processing error:', err);
    throw err;
  }
}




// Clean up uploaded files
async function cleanupFile(filePath) {
  try {
    if (filePath) {
      await fs.unlink(filePath);
    }
  } catch (err) {
    console.error('Error cleaning up file:', err);
  }
}




// File Upload and Translation Endpoint
app.post('/api/translate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }




    console.log(`Processing file: ${req.file.originalname}`);




    // Extract text from file
    const fileContent = await processUploadedFile(req.file.path, req.file.originalname);
    const targetLang = req.body.targetLanguage || 'Chinese';




    // Get translation from GROQ
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `Translate the following text to ${targetLang} while maintaining the original meaning and tone:`
        },
        {
          role: 'user',
          content: fileContent.substring(0, 2000) // Limit to first 2000 chars
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 2048
    });




    const translatedText = response.choices[0]?.message?.content || '';




    // Clean up file
    await cleanupFile(req.file.path);




    res.json({
      success: true,
      originalText: fileContent.substring(0, 2000),
      translatedText,
      language: targetLang,
      originalLength: fileContent.length
    });




  } catch (error) {
    console.error('Translation error:', error.message);
   
    if (req.file) {
      await cleanupFile(req.file.path);
    }
   
    res.status(500).json({
      error: 'Translation failed',
      message: error.message,
      suggestion: 'Please ensure you upload a valid PDF or text file with readable content'
    });
  }
});




// Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, language = 'Chinese' } = req.body;
   
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Valid message is required' });
    }




    const systemPrompt = languagePrompts[language] || languagePrompts.Chinese;
   
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024
    });




    const responseText = response.choices[0]?.message?.content || 'No response';




    res.json({
      response: responseText,
      language: language
    });




  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({
      error: 'Chat failed',
      message: error.message
    });
  }
});




// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    services: {
      fileTranslation: 'active',
      chat: 'active'
    },
    timestamp: new Date()
  });
});




// Start Server
async function startServer() {
  await ensureUploadsDir();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log(`- POST /api/translate (File upload and translation)`);
    console.log(`- POST /api/chat (Chat with GROQ)`);
    console.log(`- GET /health (Server health check)`);
  });
}




startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});


