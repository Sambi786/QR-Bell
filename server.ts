import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { v4 as uuidv4 } from 'uuid';

// --- In-Memory Database (No Firebase Required) ---
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Message {
  id: string;
  toUserId: string;
  text?: string;
  voiceData?: string; // Base64 audio data
  timestamp: string;
}

const users = new Map<string, User>();
const messages: Message[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- API Routes ---

  // Register / Login (Simple version for demo)
  app.post('/api/auth', (req, res) => {
    const { email, name, phone } = req.body;
    let user = Array.from(users.values()).find(u => u.email === email);
    
    if (!user) {
      user = { id: uuidv4(), email, name: name || email.split('@')[0], phone };
      users.set(user.id, user);
    } else if (phone !== undefined) {
      // Allow updating phone during "login" for simplicity in this demo
      user.phone = phone;
    }
    res.json(user);
  });

  // Get User Profile
  app.get('/api/users/:id', (req, res) => {
    const user = users.get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ name: user.name, phone: user.phone });
  });

  // Send Message (The "Public" Reach API)
  app.post('/api/messages/:toUserId', (req, res) => {
    const { toUserId } = req.params;
    const { text, voiceData } = req.body;
    
    if (!text && !voiceData) return res.status(400).json({ error: 'Message text or voice is required' });
    
    const message: Message = {
      id: uuidv4(),
      toUserId,
      text,
      voiceData,
      timestamp: new Date().toISOString()
    };
    
    messages.push(message);
    res.json({ success: true });
  });

  // Get Messages for Dashboard
  app.get('/api/messages/:userId', (req, res) => {
    const userMessages = messages
      .filter(m => m.toUserId === req.params.userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(userMessages);
  });

  // Delete Message
  app.delete('/api/messages/:id', (req, res) => {
    const index = messages.findIndex(m => m.id === req.params.id);
    if (index !== -1) {
      messages.splice(index, 1);
    }
    res.json({ success: true });
  });

  // --- Vite / Static Files ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`(This app uses an in-memory database - data will reset on server restart)`);
  });
}

startServer();
