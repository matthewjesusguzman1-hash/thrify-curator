import { useState, useEffect, useCallback, useRef } from "react";
import { X, Trophy, Heart, Shirt, Volume2, VolumeX } from "lucide-react";

// Game constants
const TILE_WIDTH = 48;
const TILE_HEIGHT = 28;
const GAME_COLS = 9;
const GAME_ROWS = 11;

// Convert grid to isometric position
const toIso = (col, row) => {
  const x = (col - row) * (TILE_WIDTH / 2) + 180;
  const y = (col + row) * (TILE_HEIGHT / 2) + 20;
  return { x, y };
};

// Tile types
const TILES = {
  FLOOR: 0,
  RACK: 1,
  REGISTER: 2,
};

// Create level
const createLevel = () => [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 0, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 1, 1, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 0, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 2, 2, 2, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Generate entities
const generateEntities = (map, level) => {
  const entities = { enemies: [], clothing: [] };
  const spots = [];
  
  for (let r = 1; r < GAME_ROWS - 2; r++) {
    for (let c = 1; c < GAME_COLS - 1; c++) {
      if (map[r][c] === TILES.FLOOR && !(c <= 1 && r <= 1)) {
        spots.push({ col: c, row: r });
      }
    }
  }
  
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [spots[i], spots[j]] = [spots[j], spots[i]];
  }
  
  // Enemies (Karens and wanderers)
  const enemyCount = Math.min(2 + level, 5);
  for (let i = 0; i < enemyCount && spots.length > 0; i++) {
    const spot = spots.pop();
    entities.enemies.push({
      ...spot,
      type: i % 2 === 0 ? 'karen' : 'wanderer',
      dir: Math.random() > 0.5 ? 1 : -1,
      moveAxis: i % 2 === 0 ? 'col' : 'row',
      animFrame: 0,
    });
  }
  
  // Clothing
  const clothingCount = Math.min(5 + level, 12);
  for (let i = 0; i < clothingCount && spots.length > 0; i++) {
    const spot = spots.pop();
    entities.clothing.push({
      ...spot,
      collected: false,
      type: Math.floor(Math.random() * 5),
      bobOffset: Math.random() * Math.PI * 2,
    });
  }
  
  return entities;
};

// Clothing styles
const CLOTHING_STYLES = [
  { emoji: '👗', color: '#EC4899' },
  { emoji: '👔', color: '#3B82F6' },
  { emoji: '👕', color: '#10B981' },
  { emoji: '👖', color: '#6366F1' },
  { emoji: '🧥', color: '#F59E0B' },
];

export default function ThriftRunGame({ onClose }) {
  const [gameState, setGameState] = useState("start");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [player, setPlayer] = useState({ col: 0, row: 0 });
  const [playerDir, setPlayerDir] = useState('down');
  const [map] = useState(() => createLevel());
  const [entities, setEntities] = useState(() => generateEntities(createLevel(), 1));
  const [particles, setParticles] = useState([]);
  const [screenShake, setScreenShake] = useState(0);
  const [invincible, setInvincible] = useState(false);
  const [animTime, setAnimTime] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem("thriftrun_hs") || "0");
  });
  
  const lastMoveRef = useRef(0);
  const touchStartRef = useRef(null);

  // Animation loop
  useEffect(() => {
    const interval = setInterval(() => setAnimTime(t => t + 1), 50);
    return () => clearInterval(interval);
  }, []);

  // Screen shake decay
  useEffect(() => {
    if (screenShake > 0) {
      const timeout = setTimeout(() => setScreenShake(s => Math.max(0, s - 1)), 50);
      return () => clearTimeout(timeout);
    }
  }, [screenShake]);

  // Particle cleanup
  useEffect(() => {
    if (particles.length > 0) {
      const timeout = setTimeout(() => {
        setParticles(p => p.filter(particle => Date.now() - particle.created < 1000));
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [particles]);

  const addParticles = (col, row, color, count = 8) => {
    const pos = toIso(col, row);
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: pos.x,
        y: pos.y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8 - 3,
        color,
        created: Date.now(),
      });
    }
    setParticles(p => [...p, ...newParticles]);
  };

  const startGame = useCallback(() => {
    setEntities(generateEntities(map, 1));
    setPlayer({ col: 0, row: 0 });
    setPlayerDir('down');
    setLevel(1);
    setScore(0);
    setLives(3);
    setParticles([]);
    setInvincible(false);
    setGameState("playing");
  }, [map]);

  const nextLevel = useCallback(() => {
    const newLevel = level + 1;
    setEntities(generateEntities(map, newLevel));
    setPlayer({ col: 0, row: 0 });
    setLevel(newLevel);
    setScore(s => s + 1000);
    addParticles(4, 5, '#22C55E', 20);
  }, [level, map]);

  const movePlayer = useCallback((dCol, dRow) => {
    if (gameState !== "playing" || invincible) return;
    
    const now = Date.now();
    if (now - lastMoveRef.current < 150) return;
    lastMoveRef.current = now;
    
    // Set direction
    if (dCol > 0) setPlayerDir('right');
    else if (dCol < 0) setPlayerDir('left');
    else if (dRow > 0) setPlayerDir('down');
    else if (dRow < 0) setPlayerDir('up');
    
    setPlayer(prev => {
      const newCol = Math.max(0, Math.min(GAME_COLS - 1, prev.col + dCol));
      const newRow = Math.max(0, Math.min(GAME_ROWS - 1, prev.row + dRow));
      
      if (map[newRow][newCol] === TILES.RACK) return prev;
      
      if (map[newRow][newCol] === TILES.REGISTER) {
        setGameState("levelComplete");
        return prev;
      }
      
      return { col: newCol, row: newRow };
    });
  }, [gameState, invincible, map]);

  // Collision & collection
  useEffect(() => {
    if (gameState !== "playing") return;
    
    // Enemy collision
    if (!invincible) {
      for (const enemy of entities.enemies) {
        if (enemy.col === player.col && enemy.row === player.row) {
          setScreenShake(10);
          setInvincible(true);
          setTimeout(() => setInvincible(false), 1500);
          addParticles(player.col, player.row, '#EF4444', 12);
          
          setLives(l => {
            if (l <= 1) {
              setGameState("lost");
              if (score > highScore) {
                setHighScore(score);
                localStorage.setItem("thriftrun_hs", score.toString());
              }
              return 0;
            }
            setPlayer({ col: 0, row: 0 });
            return l - 1;
          });
          break;
        }
      }
    }
    
    // Clothing collection
    setEntities(prev => {
      let collected = false;
      const newClothing = prev.clothing.map(c => {
        if (!c.collected && c.col === player.col && c.row === player.row) {
          collected = true;
          addParticles(c.col, c.row, CLOTHING_STYLES[c.type].color, 10);
          return { ...c, collected: true };
        }
        return c;
      });
      if (collected) setScore(s => s + 150);
      return { ...prev, clothing: newClothing };
    });
  }, [player, entities.enemies, gameState, invincible, score, highScore]);

  // Enemy AI
  useEffect(() => {
    if (gameState !== "playing") return;
    
    const interval = setInterval(() => {
      setEntities(prev => ({
        ...prev,
        enemies: prev.enemies.map(enemy => {
          let newCol = enemy.col;
          let newRow = enemy.row;
          let newDir = enemy.dir;
          
          if (enemy.moveAxis === 'col') {
            newCol += enemy.dir;
            if (newCol < 1 || newCol >= GAME_COLS - 1 || map[enemy.row][newCol] === TILES.RACK) {
              newDir = -enemy.dir;
              newCol = enemy.col;
            }
          } else {
            newRow += enemy.dir;
            if (newRow < 1 || newRow >= GAME_ROWS - 2 || map[newRow][enemy.col] === TILES.RACK) {
              newDir = -enemy.dir;
              newRow = enemy.row;
            }
          }
          
          return { ...enemy, col: newCol, row: newRow, dir: newDir, animFrame: (enemy.animFrame + 1) % 4 };
        }),
      }));
    }, 700 - Math.min(level * 50, 300));
    
    return () => clearInterval(interval);
  }, [gameState, level, map]);

  // Keyboard
  useEffect(() => {
    const handleKey = (e) => {
      if (gameState !== "playing") return;
      const moves = {
        ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
        w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
      };
      if (moves[e.key]) {
        e.preventDefault();
        movePlayer(...moves[e.key]);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState, movePlayer]);

  // Touch controls
  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current || gameState !== "playing") return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const threshold = 30;
    
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      movePlayer(dx > 0 ? 1 : -1, 0);
    } else if (Math.abs(dy) > threshold) {
      movePlayer(0, dy > 0 ? 1 : -1);
    }
    touchStartRef.current = null;
  };

  // Level complete
  useEffect(() => {
    if (gameState === "levelComplete") {
      const timer = setTimeout(() => {
        nextLevel();
        setGameState("playing");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState, nextLevel]);

  const shakeStyle = screenShake > 0 ? {
    transform: `translate(${(Math.random() - 0.5) * screenShake}px, ${(Math.random() - 0.5) * screenShake}px)`
  } : {};

  // Render isometric tile
  const renderTile = (type, col, row) => {
    const { x, y } = toIso(col, row);
    const zIndex = row + col;
    
    return (
      <div
        key={`${col}-${row}`}
        className="absolute"
        style={{
          left: x,
          top: y,
          width: TILE_WIDTH,
          height: TILE_HEIGHT * 2,
          zIndex,
        }}
      >
        {/* Floor tile */}
        <svg width={TILE_WIDTH} height={TILE_HEIGHT * 2} viewBox="0 0 48 56">
          {/* Isometric floor diamond */}
          <polygon
            points="24,0 48,14 24,28 0,14"
            fill={type === TILES.REGISTER ? '#22C55E' : '#FEF3C7'}
            stroke={type === TILES.REGISTER ? '#16A34A' : '#D97706'}
            strokeWidth="1"
          />
          {type === TILES.FLOOR && (
            <polygon
              points="24,2 46,14 24,26 2,14"
              fill="url(#floorGradient)"
              opacity="0.3"
            />
          )}
        </svg>
        
        {/* Rack */}
        {type === TILES.RACK && (
          <div className="absolute" style={{ left: 4, top: -20 }}>
            <svg width="40" height="50" viewBox="0 0 40 50">
              {/* Rack frame */}
              <rect x="4" y="20" width="4" height="30" fill="#78350F" />
              <rect x="32" y="20" width="4" height="30" fill="#78350F" />
              <rect x="4" y="18" width="32" height="4" fill="#92400E" rx="1" />
              {/* Hanging clothes */}
              <g transform="translate(8, 22)">
                {[0, 8, 16].map((offset, i) => (
                  <g key={i} transform={`translate(${offset}, ${Math.sin(animTime * 0.1 + i) * 2})`}>
                    <rect x="0" y="0" width="6" height="12" rx="1" fill={['#EC4899', '#3B82F6', '#10B981'][i]} />
                    <rect x="1" y="0" width="4" height="2" rx="0.5" fill={['#DB2777', '#2563EB', '#059669'][i]} />
                  </g>
                ))}
              </g>
            </svg>
          </div>
        )}
        
        {/* Register */}
        {type === TILES.REGISTER && (
          <div className="absolute flex flex-col items-center" style={{ left: 8, top: -16 }}>
            <div 
              className="text-xl"
              style={{ 
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                animation: 'bounce 1s ease-in-out infinite',
              }}
            >
              💰
            </div>
            <span className="text-[8px] font-bold text-green-800 bg-green-200 px-1 rounded">REGISTER</span>
          </div>
        )}
      </div>
    );
  };

  // Render player
  const renderPlayer = () => {
    const { x, y } = toIso(player.col, player.row);
    const zIndex = player.row + player.col + 0.5;
    const bob = Math.sin(animTime * 0.3) * 2;
    
    return (
      <div
        className={`absolute transition-all duration-150 ${invincible ? 'animate-pulse opacity-70' : ''}`}
        style={{
          left: x + 8,
          top: y - 24 + bob,
          zIndex: zIndex + 100,
        }}
      >
        {/* Shadow */}
        <div 
          className="absolute rounded-full bg-black/30"
          style={{ width: 32, height: 12, left: 0, top: 44, filter: 'blur(4px)' }}
        />
        
        {/* Player character */}
        <div className="relative">
          {/* Glow */}
          <div 
            className="absolute rounded-full animate-ping"
            style={{
              width: 40, height: 40, left: -4, top: 4,
              background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 70%)',
            }}
          />
          
          {/* Body */}
          <svg width="32" height="48" viewBox="0 0 32 48">
            {/* Cart */}
            <rect x="4" y="32" width="24" height="14" rx="3" fill="#0891B2" stroke="#0E7490" strokeWidth="2" />
            <circle cx="8" cy="48" r="3" fill="#334155" />
            <circle cx="24" cy="48" r="3" fill="#334155" />
            <rect x="6" y="34" width="20" height="4" fill="#22D3EE" rx="1" />
            
            {/* Person */}
            <circle cx="16" cy="12" r="10" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
            <circle cx="12" cy="10" r="2" fill="#1F2937" />
            <circle cx="20" cy="10" r="2" fill="#1F2937" />
            <path d="M12 16 Q16 20 20 16" stroke="#1F2937" strokeWidth="2" fill="none" />
            
            {/* Body */}
            <rect x="10" y="22" width="12" height="14" rx="2" fill="#6366F1" />
          </svg>
          
          {/* Direction indicator */}
          <div 
            className="absolute w-0 h-0"
            style={{
              left: playerDir === 'left' ? -8 : playerDir === 'right' ? 32 : 12,
              top: playerDir === 'up' ? -4 : playerDir === 'down' ? 48 : 20,
              borderLeft: playerDir === 'right' ? '8px solid #06B6D4' : '6px solid transparent',
              borderRight: playerDir === 'left' ? '8px solid #06B6D4' : '6px solid transparent',
              borderTop: playerDir === 'down' ? '8px solid #06B6D4' : '6px solid transparent',
              borderBottom: playerDir === 'up' ? '8px solid #06B6D4' : '6px solid transparent',
            }}
          />
        </div>
      </div>
    );
  };

  // Render enemy
  const renderEnemy = (enemy) => {
    const { x, y } = toIso(enemy.col, enemy.row);
    const zIndex = enemy.row + enemy.col + 0.5;
    const wobble = Math.sin(animTime * 0.2 + enemy.col) * 3;
    
    return (
      <div
        key={`enemy-${enemy.col}-${enemy.row}`}
        className="absolute transition-all duration-300"
        style={{ left: x + 8, top: y - 20 + wobble, zIndex }}
      >
        {/* Shadow */}
        <div 
          className="absolute rounded-full bg-black/30"
          style={{ width: 28, height: 10, left: 2, top: 42, filter: 'blur(3px)' }}
        />
        
        {enemy.type === 'karen' ? (
          <div className="relative">
            {/* Danger indicator */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-50" />
            
            <svg width="32" height="44" viewBox="0 0 32 44">
              {/* Cart */}
              <rect x="2" y="28" width="28" height="12" rx="2" fill="#DC2626" stroke="#B91C1C" strokeWidth="2" />
              <circle cx="6" cy="42" r="2.5" fill="#1F2937" />
              <circle cx="26" cy="42" r="2.5" fill="#1F2937" />
              
              {/* Karen */}
              <circle cx="16" cy="10" r="8" fill="#FCD34D" stroke="#FBBF24" strokeWidth="2" />
              <path d="M8 6 Q16 -2 24 6" stroke="#92400E" strokeWidth="3" fill="none" />
              <circle cx="12" cy="9" r="1.5" fill="#1F2937" />
              <circle cx="20" cy="9" r="1.5" fill="#1F2937" />
              <path d="M12 14 L20 14" stroke="#1F2937" strokeWidth="2" />
              <rect x="10" y="18" width="12" height="12" rx="2" fill="#F472B6" />
            </svg>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
            
            <svg width="28" height="40" viewBox="0 0 28 40">
              <circle cx="14" cy="10" r="8" fill="#D4A574" stroke="#A3724E" strokeWidth="2" />
              <rect x="4" y="4" width="20" height="8" rx="2" fill="#78350F" />
              <circle cx="10" cy="9" r="1.5" fill="#1F2937" />
              <circle cx="18" cy="9" r="1.5" fill="#1F2937" />
              <rect x="8" y="18" width="12" height="16" rx="2" fill="#6B7280" />
              <rect x="6" y="34" width="6" height="6" fill="#4B5563" />
              <rect x="16" y="34" width="6" height="6" fill="#4B5563" />
            </svg>
          </div>
        )}
      </div>
    );
  };

  // Render clothing
  const renderClothing = (item) => {
    if (item.collected) return null;
    const { x, y } = toIso(item.col, item.row);
    const zIndex = item.row + item.col;
    const bob = Math.sin(animTime * 0.15 + item.bobOffset) * 4;
    const style = CLOTHING_STYLES[item.type];
    
    return (
      <div
        key={`cloth-${item.col}-${item.row}`}
        className="absolute"
        style={{ left: x + 14, top: y - 8 + bob, zIndex }}
      >
        <div className="relative">
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{ 
              background: `radial-gradient(circle, ${style.color}40 0%, transparent 70%)`,
              transform: 'scale(2)',
            }}
          />
          <span className="text-2xl drop-shadow-lg">{style.emoji}</span>
        </div>
      </div>
    );
  };

  // Render particles
  const renderParticles = () => particles.map(p => {
    const age = (Date.now() - p.created) / 1000;
    const opacity = 1 - age;
    return (
      <div
        key={p.id}
        className="absolute w-2 h-2 rounded-full"
        style={{
          left: p.x + p.vx * age * 60,
          top: p.y + p.vy * age * 60 + age * age * 100,
          background: p.color,
          opacity,
          transform: `scale(${1 - age * 0.5})`,
        }}
      />
    );
  });

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #1E1B4B 0%, #312E81 50%, #1E1B4B 100%)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* SVG Defs */}
      <svg className="absolute w-0 h-0">
        <defs>
          <linearGradient id="floorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white">
        <X className="w-5 h-5" />
      </button>
      
      {/* Title */}
      <div className="absolute top-4 left-0 right-0 text-center z-40">
        <h1 className="text-2xl font-black tracking-widest" style={{
          background: 'linear-gradient(135deg, #F472B6, #A855F7, #06B6D4)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>THRIFT RUN</h1>
      </div>
      
      {/* HUD */}
      <div className="absolute top-14 left-0 right-0 flex justify-center gap-3 z-40">
        <div className="flex items-center gap-1 px-3 py-1 bg-black/40 backdrop-blur rounded-full">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-bold tabular-nums">{score}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-black/40 backdrop-blur rounded-full">
          {[...Array(3)].map((_, i) => (
            <Heart key={i} className={`w-4 h-4 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
          ))}
        </div>
        <div className="px-3 py-1 bg-black/40 backdrop-blur rounded-full">
          <span className="text-green-400 font-bold text-sm">LVL {level}</span>
        </div>
      </div>
      
      {/* Game Area */}
      <div className="absolute inset-0 flex items-center justify-center" style={shakeStyle}>
        <div className="relative" style={{ width: 400, height: 450 }}>
          {/* Tiles */}
          {map.map((row, r) => row.map((tile, c) => renderTile(tile, c, r)))}
          
          {/* Clothing */}
          {entities.clothing.map(renderClothing)}
          
          {/* Enemies */}
          {entities.enemies.map(renderEnemy)}
          
          {/* Player */}
          {gameState === "playing" && renderPlayer()}
          
          {/* Particles */}
          {renderParticles()}
        </div>
      </div>
      
      {/* D-Pad */}
      {gameState === "playing" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
          <div className="relative w-32 h-32">
            {[
              { d: 'up', x: '50%', y: 0, tx: '-50%', ty: 0, dc: 0, dr: -1 },
              { d: 'down', x: '50%', y: 'auto', b: 0, tx: '-50%', dc: 0, dr: 1 },
              { d: 'left', x: 0, y: '50%', ty: '-50%', dc: -1, dr: 0 },
              { d: 'right', x: 'auto', r: 0, y: '50%', ty: '-50%', dc: 1, dr: 0 },
            ].map(({ d, dc, dr, ...pos }) => (
              <button
                key={d}
                onTouchStart={(e) => { e.stopPropagation(); movePlayer(dc, dr); }}
                onClick={() => movePlayer(dc, dr)}
                className="absolute w-11 h-11 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center active:bg-white/30 active:scale-95 transition-all"
                style={{
                  left: pos.x, top: pos.y, right: pos.r, bottom: pos.b,
                  transform: `translateX(${pos.tx || 0}) translateY(${pos.ty || 0})`,
                }}
              >
                <span className="text-white/80 text-lg">
                  {d === 'up' ? '▲' : d === 'down' ? '▼' : d === 'left' ? '◀' : '▶'}
                </span>
              </button>
            ))}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 border border-white/10" />
          </div>
        </div>
      )}
      
      {/* Start Screen */}
      {gameState === "start" && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6">
          <h2 className="text-4xl font-black mb-2" style={{
            background: 'linear-gradient(135deg, #F472B6, #A855F7, #06B6D4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>THRIFT RUN</h2>
          <p className="text-indigo-400 text-sm mb-8 tracking-widest">ISOMETRIC EDITION</p>
          
          <div className="space-y-3 text-gray-300 text-sm mb-8">
            <p className="flex items-center gap-3"><span className="text-xl">🛒</span> Navigate the thrift store</p>
            <p className="flex items-center gap-3"><span className="text-xl">👩</span> Avoid Karens with carts</p>
            <p className="flex items-center gap-3"><span className="text-xl">🧔</span> Watch for wanderers</p>
            <p className="flex items-center gap-3"><span className="text-xl">👗</span> Collect clothes +150pts</p>
            <p className="flex items-center gap-3"><span className="text-xl">💰</span> Reach the REGISTER!</p>
          </div>
          
          <p className="text-gray-500 text-xs mb-6">Swipe or use D-Pad to move</p>
          
          <button onClick={startGame} className="px-12 py-4 rounded-2xl text-white font-bold text-xl shadow-xl active:scale-95 transition-all" style={{
            background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
            boxShadow: '0 0 40px rgba(139,92,246,0.4)',
          }}>
            START
          </button>
          
          {highScore > 0 && (
            <p className="mt-4 text-gray-500 text-sm">Best: <span className="text-yellow-400 font-bold">{highScore}</span></p>
          )}
        </div>
      )}
      
      {/* Level Complete */}
      {gameState === "levelComplete" && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur flex flex-col items-center justify-center z-50">
          <h2 className="text-4xl font-black text-green-400 mb-4 animate-bounce">LEVEL {level}!</h2>
          <p className="text-2xl text-yellow-400 font-bold">+1000 BONUS</p>
          <p className="text-gray-400 mt-6">Next level loading...</p>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === "lost" && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur flex flex-col items-center justify-center z-50">
          <h2 className="text-4xl font-black text-red-500 mb-6">GAME OVER</h2>
          <p className="text-gray-400 mb-2">Final Score</p>
          <p className="text-5xl font-black text-yellow-400 mb-6">{score}</p>
          {score >= highScore && score > 0 && (
            <p className="text-yellow-300 text-lg mb-6 animate-pulse">🏆 NEW RECORD! 🏆</p>
          )}
          <button onClick={startGame} className="px-12 py-4 rounded-2xl text-white font-bold text-xl shadow-xl" style={{
            background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
          }}>
            RETRY
          </button>
        </div>
      )}
      
      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      `}</style>
    </div>
  );
}
