import { useState, useEffect, useCallback, useRef } from "react";
import { X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ShoppingCart, Trophy, Heart, Shirt, DollarSign } from "lucide-react";

// Game constants
const TILE_SIZE = 28;
const GAME_WIDTH = 13;
const GAME_HEIGHT = 15;

// Tile types
const TILES = {
  EMPTY: 0,
  RACK: 1,
  PLAYER: 2,
  KAREN: 3,
  HOMELESS: 4,
  CLOTHING: 5,
  REGISTER: 6,
  WALL: 7,
};

// Create level layout
const createLevel = (level) => {
  const baseMap = [
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
    [7, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 7],
    [7, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 7],
    [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
    [7, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 7],
    [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
    [7, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 7],
    [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
    [7, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 7],
    [7, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 7],
    [7, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 7],
    [7, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 7],
    [7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7],
    [7, 7, 7, 7, 7, 6, 6, 6, 7, 7, 7, 7, 7],
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  ];
  return baseMap;
};

// Generate entities
const generateEntities = (map, level) => {
  const entities = { karens: [], homeless: [], clothing: [] };
  const emptySpots = [];
  
  for (let y = 2; y < GAME_HEIGHT - 2; y++) {
    for (let x = 1; x < GAME_WIDTH - 1; x++) {
      if (map[y][x] === TILES.EMPTY && !(x <= 2 && y <= 2)) {
        emptySpots.push({ x, y });
      }
    }
  }
  
  // Shuffle
  for (let i = emptySpots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emptySpots[i], emptySpots[j]] = [emptySpots[j], emptySpots[i]];
  }
  
  const karenCount = Math.min(2 + level, 6);
  for (let i = 0; i < karenCount && emptySpots.length > 0; i++) {
    const spot = emptySpots.pop();
    entities.karens.push({ ...spot, dir: Math.random() > 0.5 ? 1 : -1, frame: 0 });
  }
  
  const homelessCount = Math.min(1 + Math.floor(level / 2), 4);
  for (let i = 0; i < homelessCount && emptySpots.length > 0; i++) {
    const spot = emptySpots.pop();
    entities.homeless.push({ ...spot, dir: Math.random() > 0.5 ? 1 : -1, frame: 0 });
  }
  
  const clothingCount = Math.min(4 + level, 10);
  for (let i = 0; i < clothingCount && emptySpots.length > 0; i++) {
    const spot = emptySpots.pop();
    entities.clothing.push({ ...spot, collected: false, type: Math.floor(Math.random() * 4) });
  }
  
  return entities;
};

// Clothing colors
const clothingColors = [
  { primary: '#EC4899', secondary: '#DB2777' }, // Pink
  { primary: '#3B82F6', secondary: '#2563EB' }, // Blue
  { primary: '#10B981', secondary: '#059669' }, // Green
  { primary: '#F59E0B', secondary: '#D97706' }, // Orange
];

export default function ThriftRunGame({ onClose }) {
  const [gameState, setGameState] = useState("start");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [map, setMap] = useState(() => createLevel(1));
  const [entities, setEntities] = useState(() => generateEntities(createLevel(1), 1));
  const [itemsCollected, setItemsCollected] = useState(0);
  const [playerFrame, setPlayerFrame] = useState(0);
  const [flashPlayer, setFlashPlayer] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("thriftrun_highscore");
    return saved ? parseInt(saved) : 0;
  });
  
  const gameLoopRef = useRef(null);
  const animationRef = useRef(null);
  const lastMoveRef = useRef(0);

  // Player animation
  useEffect(() => {
    if (gameState !== "playing") return;
    animationRef.current = setInterval(() => {
      setPlayerFrame(f => (f + 1) % 4);
    }, 200);
    return () => clearInterval(animationRef.current);
  }, [gameState]);

  const startGame = useCallback(() => {
    const newMap = createLevel(1);
    setMap(newMap);
    setEntities(generateEntities(newMap, 1));
    setPlayer({ x: 1, y: 1 });
    setLevel(1);
    setScore(0);
    setLives(3);
    setItemsCollected(0);
    setGameState("playing");
  }, []);

  const nextLevel = useCallback(() => {
    const newLevel = level + 1;
    const newMap = createLevel(newLevel);
    setMap(newMap);
    setEntities(generateEntities(newMap, newLevel));
    setPlayer({ x: 1, y: 1 });
    setLevel(newLevel);
    setItemsCollected(0);
    setScore(s => s + 500);
  }, [level]);

  const movePlayer = useCallback((dx, dy) => {
    if (gameState !== "playing") return;
    
    const now = Date.now();
    if (now - lastMoveRef.current < 120) return;
    lastMoveRef.current = now;
    
    setPlayer(prev => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;
      
      if (newX < 0 || newX >= GAME_WIDTH || newY < 0 || newY >= GAME_HEIGHT) return prev;
      
      const tile = map[newY][newX];
      if (tile === TILES.RACK || tile === TILES.WALL) return prev;
      
      if (tile === TILES.REGISTER) {
        setGameState("levelComplete");
        return prev;
      }
      
      return { x: newX, y: newY };
    });
  }, [gameState, map]);

  // Collision detection
  useEffect(() => {
    if (gameState !== "playing") return;
    
    const checkCollision = () => {
      for (const karen of entities.karens) {
        if (karen.x === player.x && karen.y === player.y) {
          handleHit();
          return;
        }
      }
      for (const h of entities.homeless) {
        if (h.x === player.x && h.y === player.y) {
          handleHit();
          return;
        }
      }
    };
    
    const handleHit = () => {
      setFlashPlayer(true);
      setTimeout(() => setFlashPlayer(false), 500);
      
      setLives(l => {
        const newLives = l - 1;
        if (newLives <= 0) {
          setGameState("lost");
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem("thriftrun_highscore", score.toString());
          }
        } else {
          setPlayer({ x: 1, y: 1 });
        }
        return newLives;
      });
    };
    
    checkCollision();
    
    // Clothing collection
    setEntities(prev => {
      let collected = false;
      const newClothing = prev.clothing.map(c => {
        if (!c.collected && c.x === player.x && c.y === player.y) {
          collected = true;
          return { ...c, collected: true };
        }
        return c;
      });
      
      if (collected) {
        setScore(s => s + 100);
        setItemsCollected(i => i + 1);
      }
      
      return { ...prev, clothing: newClothing };
    });
  }, [player, entities, gameState, score, highScore]);

  // Enemy movement
  useEffect(() => {
    if (gameState !== "playing") return;
    
    const moveEnemies = () => {
      setEntities(prev => {
        const newKarens = prev.karens.map(karen => {
          let newX = karen.x + karen.dir;
          if (newX < 1 || newX >= GAME_WIDTH - 1 || map[karen.y][newX] === TILES.RACK || map[karen.y][newX] === TILES.WALL) {
            return { ...karen, dir: -karen.dir, frame: (karen.frame + 1) % 2 };
          }
          return { ...karen, x: newX, frame: (karen.frame + 1) % 2 };
        });
        
        const newHomeless = prev.homeless.map(h => {
          let newY = h.y + h.dir;
          if (newY < 1 || newY >= GAME_HEIGHT - 2 || map[newY][h.x] === TILES.RACK || map[newY][h.x] === TILES.WALL) {
            return { ...h, dir: -h.dir, frame: (h.frame + 1) % 2 };
          }
          return { ...h, y: newY, frame: (h.frame + 1) % 2 };
        });
        
        return { ...prev, karens: newKarens, homeless: newHomeless };
      });
    };
    
    gameLoopRef.current = setInterval(moveEnemies, 600 - Math.min(level * 40, 250));
    return () => clearInterval(gameLoopRef.current);
  }, [gameState, level, map]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== "playing") return;
      switch (e.key) {
        case "ArrowUp": case "w": e.preventDefault(); movePlayer(0, -1); break;
        case "ArrowDown": case "s": e.preventDefault(); movePlayer(0, 1); break;
        case "ArrowLeft": case "a": e.preventDefault(); movePlayer(-1, 0); break;
        case "ArrowRight": case "d": e.preventDefault(); movePlayer(1, 0); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, movePlayer]);

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

  // Render player (prominent shopping cart)
  const renderPlayer = () => {
    const bounce = playerFrame % 2 === 0 ? 'translateY(-2px)' : 'translateY(0)';
    return (
      <div 
        className="absolute z-50 flex items-center justify-center"
        style={{
          left: player.x * TILE_SIZE,
          top: player.y * TILE_SIZE,
          width: TILE_SIZE,
          height: TILE_SIZE,
          transform: bounce,
          transition: 'left 0.1s, top 0.1s',
        }}
      >
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(0,212,255,0.6) 0%, rgba(0,212,255,0) 70%)',
            transform: 'scale(1.8)',
          }}
        />
        {/* Player circle */}
        <div 
          className={`relative w-6 h-6 rounded-full flex items-center justify-center shadow-lg ${flashPlayer ? 'animate-ping' : ''}`}
          style={{
            background: 'linear-gradient(135deg, #00D4FF 0%, #0EA5E9 50%, #0284C7 100%)',
            boxShadow: '0 0 15px rgba(0,212,255,0.8), 0 0 30px rgba(0,212,255,0.4)',
            border: '2px solid #fff',
          }}
        >
          <ShoppingCart className="w-4 h-4 text-white drop-shadow-md" strokeWidth={2.5} />
        </div>
        {/* Direction indicator */}
        <div 
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: '6px solid #00D4FF',
          }}
        />
      </div>
    );
  };

  // Render tile
  const renderTile = (tileType, x, y) => {
    const karen = entities.karens.find(k => k.x === x && k.y === y);
    const homeless = entities.homeless.find(h => h.x === x && h.y === y);
    const clothing = entities.clothing.find(c => c.x === x && c.y === y && !c.collected);
    
    let bgStyle = { background: '#FEF3C7' }; // Warm floor
    let content = null;
    
    if (tileType === TILES.WALL) {
      bgStyle = { background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)' };
    } else if (tileType === TILES.RACK) {
      bgStyle = { background: '#FDE68A' };
      content = (
        <div className="w-full h-full flex items-center justify-center p-0.5">
          <div 
            className="w-full h-full rounded-sm flex flex-col items-center justify-center"
            style={{
              background: 'linear-gradient(180deg, #92400E 0%, #78350F 100%)',
              boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {/* Hanging clothes */}
            <div className="flex gap-0.5 mt-1">
              <div className="w-1.5 h-3 rounded-sm" style={{ background: '#EC4899' }} />
              <div className="w-1.5 h-3 rounded-sm" style={{ background: '#3B82F6' }} />
              <div className="w-1.5 h-3 rounded-sm" style={{ background: '#10B981' }} />
            </div>
            {/* Rack bar */}
            <div className="w-5 h-0.5 bg-gray-400 mt-0.5 rounded-full" />
          </div>
        </div>
      );
    } else if (tileType === TILES.REGISTER) {
      bgStyle = { background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' };
      content = (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <DollarSign className="w-4 h-4 text-white animate-bounce" strokeWidth={3} />
          <span className="text-[6px] font-bold text-white/90 mt-0.5">REGISTER</span>
        </div>
      );
    }
    
    // Entities
    if (karen) {
      content = (
        <div className="w-full h-full flex items-center justify-center">
          <div 
            className="relative flex flex-col items-center"
            style={{ transform: karen.frame === 0 ? 'scaleX(1)' : 'scaleX(-1)' }}
          >
            {/* Karen with cart */}
            <div className="text-base leading-none">👩</div>
            <div 
              className="w-4 h-2 rounded-sm -mt-0.5"
              style={{ background: '#DC2626', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
            />
          </div>
          {/* Danger indicator */}
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
        </div>
      );
    } else if (homeless) {
      content = (
        <div className="w-full h-full flex items-center justify-center">
          <div 
            className="text-base leading-none"
            style={{ 
              transform: homeless.frame === 0 ? 'translateY(0)' : 'translateY(-1px)',
              filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))'
            }}
          >
            🧔
          </div>
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        </div>
      );
    } else if (clothing) {
      const colors = clothingColors[clothing.type];
      content = (
        <div className="w-full h-full flex items-center justify-center">
          <div 
            className="relative"
            style={{
              animation: 'float 2s ease-in-out infinite',
            }}
          >
            <Shirt 
              className="w-5 h-5 drop-shadow-lg" 
              style={{ color: colors.primary }}
              strokeWidth={2}
            />
            <div 
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ background: colors.primary }}
            />
          </div>
        </div>
      );
    }
    
    return (
      <div
        key={`${x}-${y}`}
        className="relative"
        style={{ 
          width: TILE_SIZE, 
          height: TILE_SIZE,
          ...bgStyle,
          borderRight: '1px solid rgba(217,119,6,0.2)',
          borderBottom: '1px solid rgba(217,119,6,0.2)',
        }}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      }}
    >
      {/* Scanline effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        }}
      />
      
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white z-50 backdrop-blur-sm transition-all"
      >
        <X className="w-5 h-5" />
      </button>
      
      {/* Title */}
      <div className="mb-3 text-center">
        <h1 
          className="text-2xl font-black tracking-wider"
          style={{
            background: 'linear-gradient(135deg, #F472B6 0%, #A855F7 50%, #06B6D4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 30px rgba(168,85,247,0.5)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          THRIFT RUN
        </h1>
        <p className="text-[10px] text-cyan-400/70 tracking-widest uppercase">Get to the register!</p>
      </div>
      
      {/* HUD */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/60 rounded-full backdrop-blur-sm border border-purple-500/30">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-bold text-sm tabular-nums">{score}</span>
        </div>
        <div className="flex items-center gap-0.5 px-3 py-1.5 bg-red-900/60 rounded-full backdrop-blur-sm border border-red-500/30">
          {[...Array(3)].map((_, i) => (
            <Heart key={i} className={`w-4 h-4 transition-all ${i < lives ? 'text-red-500 fill-red-500 scale-100' : 'text-gray-600 scale-75'}`} />
          ))}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-900/60 rounded-full backdrop-blur-sm border border-cyan-500/30">
          <Shirt className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-400 font-bold text-sm tabular-nums">{itemsCollected}</span>
        </div>
        <div className="px-3 py-1.5 bg-green-900/60 rounded-full backdrop-blur-sm border border-green-500/30">
          <span className="text-green-400 font-bold text-xs">LVL {level}</span>
        </div>
      </div>
      
      {/* High score */}
      <div className="mb-2 text-[10px] text-gray-500">
        Best: <span className="text-yellow-500/80 font-bold tabular-nums">{highScore}</span>
      </div>
      
      {/* Game board */}
      <div 
        className="relative rounded-lg overflow-hidden"
        style={{ 
          width: GAME_WIDTH * TILE_SIZE + 8,
          boxShadow: '0 0 40px rgba(168,85,247,0.3), inset 0 0 20px rgba(0,0,0,0.5)',
          border: '4px solid #78350F',
          background: '#451A03',
        }}
      >
        <div className="p-0.5 relative">
          {map.map((row, y) => (
            <div key={y} className="flex">
              {row.map((tile, x) => renderTile(tile, x, y))}
            </div>
          ))}
          {/* Player rendered on top */}
          {gameState === "playing" && renderPlayer()}
        </div>
      </div>
      
      {/* D-Pad */}
      <div className="mt-4 relative" style={{ width: 130, height: 130 }}>
        {/* Center glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)' }}
        />
        
        {[
          { dir: 'up', dx: 0, dy: -1, icon: ArrowUp, pos: 'top-0 left-1/2 -translate-x-1/2' },
          { dir: 'down', dx: 0, dy: 1, icon: ArrowDown, pos: 'bottom-0 left-1/2 -translate-x-1/2' },
          { dir: 'left', dx: -1, dy: 0, icon: ArrowLeft, pos: 'left-0 top-1/2 -translate-y-1/2' },
          { dir: 'right', dx: 1, dy: 0, icon: ArrowRight, pos: 'right-0 top-1/2 -translate-y-1/2' },
        ].map(({ dir, dx, dy, icon: Icon, pos }) => (
          <button
            key={dir}
            onTouchStart={(e) => { e.preventDefault(); movePlayer(dx, dy); }}
            onMouseDown={() => movePlayer(dx, dy)}
            className={`absolute ${pos} w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90`}
            style={{
              background: 'linear-gradient(145deg, #374151 0%, #1F2937 100%)',
              boxShadow: '0 4px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Icon className="w-5 h-5 text-gray-300" strokeWidth={2.5} />
          </button>
        ))}
        
        {/* Center */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
          style={{
            background: 'linear-gradient(145deg, #1F2937 0%, #111827 100%)',
            border: '2px solid #374151',
          }}
        />
      </div>
      
      {/* Start Screen */}
      {gameState === "start" && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 p-6">
          <div 
            className="text-4xl font-black mb-2 tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #F472B6 0%, #A855F7 50%, #06B6D4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            THRIFT RUN
          </div>
          <p className="text-cyan-400/60 text-xs mb-6 tracking-widest">ARCADE EDITION</p>
          
          <div className="text-gray-400 text-sm mb-8 text-center space-y-2 max-w-xs">
            <p className="text-white/80 font-medium">Navigate the thrift store!</p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">👩</span>
              <span>Avoid Karens with carts</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">🧔</span>
              <span>Watch for obstacles</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Shirt className="w-5 h-5 text-pink-500" />
              <span>Collect clothes +100pts</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              <span>Reach the REGISTER!</span>
            </div>
          </div>
          
          <button
            onClick={startGame}
            className="px-10 py-3 rounded-full text-white font-bold text-lg transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #06B6D4 100%)',
              boxShadow: '0 0 30px rgba(139,92,246,0.5)',
            }}
          >
            START GAME
          </button>
        </div>
      )}
      
      {/* Level Complete */}
      {gameState === "levelComplete" && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
          <div className="text-3xl font-black text-green-400 mb-2 animate-bounce">
            LEVEL {level} COMPLETE!
          </div>
          <p className="text-cyan-400 text-lg">+500 BONUS</p>
          <p className="text-gray-400 mt-4">Loading Level {level + 1}...</p>
        </div>
      )}
      
      {/* Game Over */}
      {gameState === "lost" && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-20">
          <div className="text-3xl font-black text-red-500 mb-4">GAME OVER</div>
          <p className="text-gray-400 mb-1">Final Score</p>
          <p className="text-4xl font-bold text-yellow-400 mb-4">{score}</p>
          {score >= highScore && score > 0 && (
            <p className="text-yellow-400 mb-6 animate-pulse font-bold">🏆 NEW HIGH SCORE! 🏆</p>
          )}
          <button
            onClick={startGame}
            className="px-10 py-3 rounded-full text-white font-bold text-lg transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
              boxShadow: '0 0 20px rgba(139,92,246,0.4)',
            }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}
      
      {/* CSS Animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
