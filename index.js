const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
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
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
// Handle all preflight requests (Express 5 requires a regex, not '*')
app.options(/.*/, cors(corsOptions));

app.use(express.json());

// === MongoDB Connection ===
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected');

  // Initialize GridFS bucket globally
  global.gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'profilePictures'
  });
  console.log('📦 GridFS bucket initialized');

  const port = process.env.PORT || 5000;
  server.listen(port, () => console.log(`🚀 Server running on port ${port}`));
})
.catch((err) => console.error('❌ MongoDB connection error:', err));

// === Routes ===
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);

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
