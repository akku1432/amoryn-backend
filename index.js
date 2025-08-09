const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// === Dynamic origin based on NODE_ENV ===
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = isProd
  ? ['https://www.amoryn.in', 'https://amoryn.in']
  : ['http://localhost:3000'];

// === Set up Socket.IO with CORS ===
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// === Attach io and userSocketMap globally ===
app.set('io', io);
const userSocketMap = new Map();
global.userSocketMap = userSocketMap;

// === CORS Middleware for Express ===
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin like curl or mobile apps
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
}));

app.use(express.json());

// === Serve uploaded files with CORS & CORP headers ===
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Allow cross-origin image access and avoid CORB blocking
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// === Routes ===
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);

// === MongoDB Connection ===
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected');
  server.listen(5000, () => console.log('🚀 Server running on port 5000'));
})
.catch((err) => console.error('❌ MongoDB connection error:', err));

// === WebSocket Events ===
io.on('connection', (socket) => {
  console.log('📡 User connected:', socket.id);

  socket.on('register-user', (userId) => {
    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`✅ Registered user ${userId} to socket ${socket.id}`);
    }
  });

  socket.on('call-user', ({ to, offer, from }) => {
    const targetSocket = userSocketMap.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('incoming-call', { from, offer });
    }
  });

  socket.on('answer-call', ({ to, answer }) => {
    const targetSocket = userSocketMap.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call-answered', { answer });
    }
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    const targetSocket = userSocketMap.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('ice-candidate', { candidate });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    for (const [userId, sockId] of userSocketMap.entries()) {
      if (sockId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
  });
});
