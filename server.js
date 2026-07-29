
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

// M-Pesa STK Push Simulation Route
app.post('/api/mpesa/stkpush', (req, res) => {
  const { phone, amount } = req.body;
  console.log(`\n[M-PESA SIMULATION] STK Push requested for ${phone} - KES ${amount}`);
  return res.json({
    success: true,
    message: 'STK Push triggered successfully'
  });
});

// Game Loop State
let currentMultiplier = 1.00;
let crashPoint = 1.00;
let isGameRunning = false;
let gameInterval = null;

// Function to generate crash point (House edge built-in)
function generateCrashPoint() {
  const e = 2 ** 32;
  const h = Math.floor(Math.random() * e);
  if (h % 33 === 0) return 1.00; // Instant crash ~3% of time
  return Math.max(1.00, parseFloat(((100 * e - h) / (e - h) / 100).toFixed(2)));
}

function startRound() {
  isGameRunning = true;
  currentMultiplier = 1.00;
  crashPoint = generateCrashPoint();

  // 🎯 PRINT CRASH POINT DIRECTLY IN VS CODE TERMINAL
  console.log(`\n--------------------------------------------------`);
  console.log(`🚀 [NEW ROUND] Flight Started!`);
  console.log(`🎯 [CRASH POINT DETECTED] Plane will flee away at: ${crashPoint.toFixed(2)}x`);
  console.log(`--------------------------------------------------`);

  // Broadcast round start to all connected clients
  io.emit('game_start', { players: [] });

  gameInterval = setInterval(() => {
    // 🐢 Smooth, realistic pacing (0.015 increment per tick)
    currentMultiplier += 0.015;
    
    if (currentMultiplier >= crashPoint) {
      clearInterval(gameInterval);
      currentMultiplier = crashPoint;

      console.log(`💥 [FLEW AWAY] Plane crashed at ${crashPoint.toFixed(2)}x`);

      io.emit('game_crash', { finalMultiplier: crashPoint.toFixed(2) });

      // Pause for 4 seconds before next round starts
      setTimeout(() => {
        startRound();
      }, 4000);
    } else {
      io.emit('multiplier_update', { currentMultiplier: currentMultiplier.toFixed(2) });
    }
  }, 100);
}

io.on('connection', (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);

  // Send current multiplier state if game is running
  if (isGameRunning) {
    socket.emit('multiplier_update', { currentMultiplier: currentMultiplier.toFixed(2) });
  }

  socket.on('disconnect', () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 JetPesa Server running at http://localhost:${PORT}`);
  console.log(`==================================================\n`);
  
  // Kick off first round automatically
  startRound();
});