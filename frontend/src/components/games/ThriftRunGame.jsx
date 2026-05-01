import { useState, useEffect, useCallback, useRef } from "react";
import { X, Trophy, Heart } from "lucide-react";

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const GROUND_Y = 340;

// Platform/shelf data for level
const createPlatforms = (level) => {
  const basePlatforms = [
    // Ground
    { x: 0, y: GROUND_Y, width: GAME_WIDTH * 3, height: 60, type: 'ground' },
    // Shelving units (platforms)
    { x: 150, y: 280, width: 120, height: 20, type: 'shelf' },
    { x: 350, y: 220, width: 100, height: 20, type: 'shelf' },
    { x: 520, y: 280, width: 120, height: 20, type: 'shelf' },
    { x: 700, y: 180, width: 100, height: 20, type: 'shelf' },
    { x: 900, y: 240, width: 140, height: 20, type: 'shelf' },
    { x: 1100, y: 180, width: 100, height: 20, type: 'shelf' },
    { x: 1280, y: 260, width: 120, height: 20, type: 'shelf' },
    { x: 1500, y: 200, width: 100, height: 20, type: 'shelf' },
    { x: 1700, y: 280, width: 150, height: 20, type: 'shelf' },
    // Register at end
    { x: 1900, y: 280, width: 150, height: 60, type: 'register' },
  ];
  return basePlatforms;
};

// Generate clothing items
const createClothing = (platforms, level) => {
  const items = [];
  const types = ['👗', '👔', '👕', '👖', '🧥', '👒', '👜', '🧣'];
  
  // Place items on shelves and floating
  platforms.forEach((p, i) => {
    if (p.type === 'shelf') {
      // Item on shelf
      items.push({
        x: p.x + p.width / 2 - 15,
        y: p.y - 40,
        type: types[i % types.length],
        collected: false,
        bobOffset: Math.random() * Math.PI * 2
      });
    }
  });
  
  // Add some floating items
  for (let i = 0; i < 5 + level; i++) {
    items.push({
      x: 200 + i * 300 + Math.random() * 100,
      y: 150 + Math.random() * 100,
      type: types[Math.floor(Math.random() * types.length)],
      collected: false,
      bobOffset: Math.random() * Math.PI * 2
    });
  }
  
  return items;
};

// Generate enemies
const createEnemies = (level) => {
  const enemies = [];
  const count = Math.min(3 + level, 8);
  
  for (let i = 0; i < count; i++) {
    const isKaren = i % 2 === 0;
    enemies.push({
      x: 300 + i * 250,
      y: GROUND_Y - (isKaren ? 50 : 45),
      width: isKaren ? 50 : 40,
      height: isKaren ? 50 : 45,
      type: isKaren ? 'karen' : 'wanderer',
      direction: Math.random() > 0.5 ? 1 : -1,
      speed: 1.5 + Math.random() + (level * 0.2),
      minX: 250 + i * 250,
      maxX: 400 + i * 250,
      animFrame: 0
    });
  }
  
  return enemies;
};

export default function ThriftRunGame({ onClose }) {
  const [gameState, setGameState] = useState("start");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [cameraX, setCameraX] = useState(0);
  const [animTime, setAnimTime] = useState(0);
  const [invincible, setInvincible] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem("thriftrun_hs") || "0");
  });
  
  const [player, setPlayer] = useState({
    x: 50,
    y: GROUND_Y - 60,
    vx: 0,
    vy: 0,
    width: 50,
    height: 60,
    onGround: true,
    facing: 1
  });
  
  const [platforms, setPlatforms] = useState(() => createPlatforms(1));
  const [clothing, setClothing] = useState(() => createClothing(createPlatforms(1), 1));
  const [enemies, setEnemies] = useState(() => createEnemies(1));
  
  const keysRef = useRef({ left: false, right: false, jump: false });
  const gameLoopRef = useRef(null);

  // Animation timer
  useEffect(() => {
    const interval = setInterval(() => setAnimTime(t => t + 1), 50);
    return () => clearInterval(interval);
  }, []);

  // Start game
  const startGame = useCallback(() => {
    const newPlatforms = createPlatforms(1);
    setPlatforms(newPlatforms);
    setClothing(createClothing(newPlatforms, 1));
    setEnemies(createEnemies(1));
    setPlayer({
      x: 50,
      y: GROUND_Y - 60,
      vx: 0,
      vy: 0,
      width: 50,
      height: 60,
      onGround: true,
      facing: 1
    });
    setCameraX(0);
    setLevel(1);
    setScore(0);
    setLives(3);
    setInvincible(false);
    setGameState("playing");
  }, []);

  // Next level
  const nextLevel = useCallback(() => {
    const newLevel = level + 1;
    const newPlatforms = createPlatforms(newLevel);
    setPlatforms(newPlatforms);
    setClothing(createClothing(newPlatforms, newLevel));
    setEnemies(createEnemies(newLevel));
    setPlayer(p => ({
      ...p,
      x: 50,
      y: GROUND_Y - 60,
      vx: 0,
      vy: 0,
      onGround: true
    }));
    setCameraX(0);
    setLevel(newLevel);
    setScore(s => s + 1000);
  }, [level]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const gameLoop = () => {
      setPlayer(prev => {
        let newX = prev.x;
        let newY = prev.y;
        let newVx = prev.vx;
        let newVy = prev.vy;
        let onGround = false;
        let facing = prev.facing;

        // Horizontal movement
        if (keysRef.current.left) {
          newVx = -MOVE_SPEED;
          facing = -1;
        } else if (keysRef.current.right) {
          newVx = MOVE_SPEED;
          facing = 1;
        } else {
          newVx = 0;
        }

        // Jump
        if (keysRef.current.jump && prev.onGround) {
          newVy = JUMP_FORCE;
          keysRef.current.jump = false;
        }

        // Apply gravity
        newVy += GRAVITY;

        // Update position
        newX += newVx;
        newY += newVy;

        // Collision with platforms
        for (const platform of platforms) {
          if (
            newX + prev.width > platform.x &&
            newX < platform.x + platform.width &&
            newY + prev.height > platform.y &&
            prev.y + prev.height <= platform.y + 10
          ) {
            if (newVy > 0) {
              newY = platform.y - prev.height;
              newVy = 0;
              onGround = true;
              
              // Check if reached register
              if (platform.type === 'register') {
                setGameState("levelComplete");
              }
            }
          }
        }

        // Keep in bounds
        newX = Math.max(0, newX);

        return {
          ...prev,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          onGround,
          facing
        };
      });

      // Update camera
      setPlayer(p => {
        setCameraX(Math.max(0, p.x - 200));
        return p;
      });

      // Move enemies
      setEnemies(prevEnemies => 
        prevEnemies.map(enemy => {
          let newX = enemy.x + enemy.direction * enemy.speed;
          let newDir = enemy.direction;
          
          if (newX <= enemy.minX || newX >= enemy.maxX) {
            newDir = -enemy.direction;
            newX = enemy.x + newDir * enemy.speed;
          }
          
          return {
            ...enemy,
            x: newX,
            direction: newDir,
            animFrame: (enemy.animFrame + 1) % 20
          };
        })
      );

      // Check enemy collision
      setPlayer(p => {
        if (invincible) return p;
        
        for (const enemy of enemies) {
          const enemyScreenX = enemy.x;
          if (
            p.x + p.width > enemyScreenX &&
            p.x < enemyScreenX + enemy.width &&
            p.y + p.height > enemy.y &&
            p.y < enemy.y + enemy.height
          ) {
            // Hit by enemy
            setInvincible(true);
            setTimeout(() => setInvincible(false), 2000);
            
            setLives(l => {
              if (l <= 1) {
                setGameState("lost");
                if (score > highScore) {
                  setHighScore(score);
                  localStorage.setItem("thriftrun_hs", score.toString());
                }
                return 0;
              }
              return l - 1;
            });
            
            return { ...p, x: 50, y: GROUND_Y - 60, vx: 0, vy: 0 };
          }
        }
        return p;
      });

      // Check clothing collection
      setClothing(prevClothing => {
        let collected = false;
        const newClothing = prevClothing.map(item => {
          if (item.collected) return item;
          
          setPlayer(p => {
            if (
              p.x + p.width > item.x &&
              p.x < item.x + 30 &&
              p.y + p.height > item.y &&
              p.y < item.y + 30
            ) {
              collected = true;
              return p;
            }
            return p;
          });
          
          if (collected) {
            setScore(s => s + 150);
            return { ...item, collected: true };
          }
          return item;
        });
        return newClothing;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, platforms, enemies, invincible, score, highScore]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== "playing") return;
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = true;
      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') && !e.repeat) {
        keysRef.current.jump = true;
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

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

  // D-pad controls
  const handleDpadPress = (direction) => {
    if (gameState !== "playing") return;
    if (direction === 'left') keysRef.current.left = true;
    if (direction === 'right') keysRef.current.right = true;
    if (direction === 'up') keysRef.current.jump = true;
  };
  
  const handleDpadRelease = (direction) => {
    if (direction === 'left') keysRef.current.left = false;
    if (direction === 'right') keysRef.current.right = false;
  };

  // Render player sprite
  const renderPlayer = () => {
    const bob = player.onGround ? 0 : Math.sin(animTime * 0.5) * 2;
    const screenX = player.x - cameraX;
    
    return (
      <div
        className={`absolute transition-opacity ${invincible ? 'animate-pulse opacity-60' : ''}`}
        style={{
          left: screenX,
          top: player.y + bob,
          width: player.width,
          height: player.height,
          transform: `scaleX(${player.facing})`,
        }}
      >
        {/* Shopping cart with person */}
        <svg width="50" height="60" viewBox="0 0 50 60">
          {/* Person body */}
          <circle cx="25" cy="12" r="10" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2" />
          <circle cx="21" cy="10" r="2" fill="#1F2937" />
          <circle cx="29" cy="10" r="2" fill="#1F2937" />
          <path d="M21 16 Q25 20 29 16" stroke="#1F2937" strokeWidth="2" fill="none" />
          
          {/* Body/shirt */}
          <rect x="18" y="22" width="14" height="16" rx="2" fill="#06B6D4" />
          
          {/* Arms */}
          <rect x="10" y="24" width="8" height="6" rx="2" fill="#FBBF24" />
          <rect x="32" y="24" width="8" height="6" rx="2" fill="#FBBF24" />
          
          {/* Cart */}
          <rect x="5" y="40" width="40" height="16" rx="3" fill="#0891B2" stroke="#0E7490" strokeWidth="2" />
          <rect x="8" y="43" width="34" height="6" fill="#22D3EE" rx="2" />
          
          {/* Wheels */}
          <circle cx="12" cy="58" r="4" fill="#1F2937" stroke="#374151" strokeWidth="1" />
          <circle cx="38" cy="58" r="4" fill="#1F2937" stroke="#374151" strokeWidth="1" />
          
          {/* Cart handle */}
          <rect x="2" y="35" width="4" height="12" rx="1" fill="#6B7280" />
        </svg>
      </div>
    );
  };

  // Render enemy
  const renderEnemy = (enemy, index) => {
    const screenX = enemy.x - cameraX;
    if (screenX < -100 || screenX > GAME_WIDTH + 100) return null;
    
    const wobble = Math.sin(animTime * 0.2 + index) * 2;
    
    return (
      <div
        key={index}
        className="absolute"
        style={{
          left: screenX,
          top: enemy.y + wobble,
          width: enemy.width,
          height: enemy.height,
          transform: `scaleX(${enemy.direction})`,
        }}
      >
        {enemy.type === 'karen' ? (
          <svg width="50" height="50" viewBox="0 0 50 50">
            {/* Karen with angry face and big hair */}
            <ellipse cx="25" cy="12" rx="18" ry="12" fill="#92400E" />
            <circle cx="25" cy="18" r="12" fill="#FCD34D" stroke="#FBBF24" strokeWidth="2" />
            <circle cx="20" cy="16" r="2" fill="#1F2937" />
            <circle cx="30" cy="16" r="2" fill="#1F2937" />
            <path d="M20 24 L30 24" stroke="#1F2937" strokeWidth="2" />
            <path d="M18 12 L22 16" stroke="#1F2937" strokeWidth="2" />
            <path d="M32 12 L28 16" stroke="#1F2937" strokeWidth="2" />
            
            {/* Body */}
            <rect x="15" y="30" width="20" height="12" rx="2" fill="#EC4899" />
            
            {/* Cart */}
            <rect x="5" y="42" width="40" height="8" rx="2" fill="#DC2626" />
          </svg>
        ) : (
          <svg width="40" height="45" viewBox="0 0 40 45">
            {/* Wanderer */}
            <rect x="10" y="2" width="20" height="10" rx="2" fill="#78350F" />
            <circle cx="20" cy="16" r="10" fill="#D4A574" stroke="#A3724E" strokeWidth="2" />
            <circle cx="16" cy="14" r="2" fill="#1F2937" />
            <circle cx="24" cy="14" r="2" fill="#1F2937" />
            <ellipse cx="20" cy="20" rx="3" ry="2" fill="#1F2937" />
            
            {/* Body */}
            <rect x="12" y="26" width="16" height="14" rx="2" fill="#6B7280" />
            <rect x="8" y="40" width="10" height="5" fill="#4B5563" />
            <rect x="22" y="40" width="10" height="5" fill="#4B5563" />
          </svg>
        )}
      </div>
    );
  };

  // Render platform
  const renderPlatform = (platform, index) => {
    const screenX = platform.x - cameraX;
    if (screenX < -platform.width || screenX > GAME_WIDTH + 100) return null;
    
    if (platform.type === 'ground') {
      return (
        <div
          key={index}
          className="absolute"
          style={{
            left: screenX,
            top: platform.y,
            width: Math.min(platform.width, GAME_WIDTH + cameraX - platform.x + 200),
            height: platform.height,
          }}
        >
          <div className="w-full h-full bg-gradient-to-b from-amber-600 to-amber-800 border-t-4 border-amber-500">
            {/* Floor tiles pattern */}
            <div className="w-full h-full opacity-30" style={{
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(0,0,0,0.2) 40px, rgba(0,0,0,0.2) 42px)',
            }} />
          </div>
        </div>
      );
    }
    
    if (platform.type === 'register') {
      return (
        <div
          key={index}
          className="absolute"
          style={{
            left: screenX,
            top: platform.y,
            width: platform.width,
            height: platform.height,
          }}
        >
          <div className="w-full h-full bg-gradient-to-b from-green-500 to-green-700 rounded-t-lg border-4 border-green-400 flex flex-col items-center justify-center">
            <span className="text-3xl">💰</span>
            <span className="text-white font-bold text-xs mt-1">REGISTER</span>
          </div>
        </div>
      );
    }
    
    // Shelf platform
    return (
      <div
        key={index}
        className="absolute"
        style={{
          left: screenX,
          top: platform.y,
          width: platform.width,
          height: platform.height,
        }}
      >
        <div className="w-full h-full bg-gradient-to-b from-amber-700 to-amber-900 rounded border-2 border-amber-600 shadow-lg">
          {/* Shelf brackets */}
          <div className="absolute -bottom-4 left-2 w-2 h-4 bg-amber-800" />
          <div className="absolute -bottom-4 right-2 w-2 h-4 bg-amber-800" />
        </div>
      </div>
    );
  };

  // Render clothing item
  const renderClothingItem = (item, index) => {
    if (item.collected) return null;
    const screenX = item.x - cameraX;
    if (screenX < -50 || screenX > GAME_WIDTH + 50) return null;
    
    const bob = Math.sin(animTime * 0.15 + item.bobOffset) * 5;
    
    return (
      <div
        key={index}
        className="absolute"
        style={{
          left: screenX,
          top: item.y + bob,
        }}
      >
        <div className="relative">
          <div className="absolute inset-0 w-10 h-10 bg-yellow-400/30 rounded-full animate-pulse" style={{ transform: 'scale(1.5)' }} />
          <span className="text-3xl drop-shadow-lg">{item.type}</span>
        </div>
      </div>
    );
  };

  // Render background
  const renderBackground = () => {
    const parallaxX = -cameraX * 0.3;
    
    return (
      <>
        {/* Back wall */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-slate-700 via-slate-600 to-slate-700"
        />
        
        {/* Shelves in background */}
        <div 
          className="absolute top-0 left-0 w-full h-full opacity-30"
          style={{ transform: `translateX(${parallaxX}px)` }}
        >
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-amber-900/50 rounded"
              style={{
                left: i * 200 + 50,
                top: 60 + (i % 3) * 40,
                width: 80,
                height: 15,
              }}
            />
          ))}
        </div>
        
        {/* Ceiling lights */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: i * 200 - cameraX * 0.5,
              top: 20,
            }}
          >
            <div className="w-16 h-4 bg-yellow-200/60 rounded-full blur-sm" />
            <div className="w-2 h-8 bg-gray-600 mx-auto -mt-2" />
          </div>
        ))}
      </>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900 flex flex-col items-center justify-center"
    >
      {/* Close button */}
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 z-50 p-2 bg-red-500/80 hover:bg-red-500 rounded-full text-white"
      >
        <X className="w-5 h-5" />
      </button>
      
      {/* Title */}
      <div className="absolute top-4 left-0 right-0 text-center z-40">
        <h1 className="text-2xl font-black tracking-widest" style={{
          background: 'linear-gradient(135deg, #F472B6, #A855F7, #06B6D4)',
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
        }}>
          THRIFT RUN
        </h1>
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
      
      {/* Game viewport */}
      <div 
        className="relative overflow-hidden rounded-xl border-4 border-slate-600 shadow-2xl"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
        {/* Background */}
        {renderBackground()}
        
        {/* Platforms */}
        {platforms.map(renderPlatform)}
        
        {/* Clothing */}
        {clothing.map(renderClothingItem)}
        
        {/* Enemies */}
        {enemies.map(renderEnemy)}
        
        {/* Player */}
        {gameState === "playing" && renderPlayer()}
        
        {/* Distance indicator */}
        {gameState === "playing" && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
            Register: {Math.max(0, Math.round((1900 - player.x) / 10))}m →
          </div>
        )}
      </div>
      
      {/* D-Pad */}
      {gameState === "playing" && (
        <div className="mt-6 z-40">
          <div className="flex items-center gap-4">
            {/* Left/Right controls */}
            <div className="flex gap-2">
              <button
                onTouchStart={() => handleDpadPress('left')}
                onTouchEnd={() => handleDpadRelease('left')}
                onMouseDown={() => handleDpadPress('left')}
                onMouseUp={() => handleDpadRelease('left')}
                onMouseLeave={() => handleDpadRelease('left')}
                className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center active:bg-white/30 active:scale-95 transition-all"
              >
                <span className="text-white/80 text-2xl">◀</span>
              </button>
              <button
                onTouchStart={() => handleDpadPress('right')}
                onTouchEnd={() => handleDpadRelease('right')}
                onMouseDown={() => handleDpadPress('right')}
                onMouseUp={() => handleDpadRelease('right')}
                onMouseLeave={() => handleDpadRelease('right')}
                className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center active:bg-white/30 active:scale-95 transition-all"
              >
                <span className="text-white/80 text-2xl">▶</span>
              </button>
            </div>
            
            {/* Jump button */}
            <button
              onTouchStart={() => handleDpadPress('up')}
              onMouseDown={() => handleDpadPress('up')}
              className="w-20 h-14 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 border border-green-400 flex items-center justify-center active:scale-95 transition-all shadow-lg"
            >
              <span className="text-white font-bold">JUMP</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Start Screen */}
      {gameState === "start" && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-6">
          <h2 className="text-4xl font-black mb-2" style={{
            background: 'linear-gradient(135deg, #F472B6, #A855F7, #06B6D4)',
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
          }}>
            THRIFT RUN
          </h2>
          <p className="text-cyan-400 text-sm mb-8 tracking-widest">SIDE-SCROLLER EDITION</p>
          
          <div className="space-y-3 text-gray-300 text-sm mb-8">
            <p className="flex items-center gap-3"><span className="text-xl">🛒</span> Run through the thrift store</p>
            <p className="flex items-center gap-3"><span className="text-xl">⬅️ ➡️</span> Move left and right</p>
            <p className="flex items-center gap-3"><span className="text-xl">⬆️</span> Jump on shelves</p>
            <p className="flex items-center gap-3"><span className="text-xl">👗</span> Collect clothes +150pts</p>
            <p className="flex items-center gap-3"><span className="text-xl">👩</span> Avoid Karens!</p>
            <p className="flex items-center gap-3"><span className="text-xl">💰</span> Reach the REGISTER to win!</p>
          </div>
          
          <button 
            onClick={startGame} 
            className="px-12 py-4 rounded-2xl text-white font-bold text-xl shadow-xl active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg, #EC4899, #8B5CF6)',
              boxShadow: '0 0 40px rgba(139,92,246,0.4)',
            }}
          >
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
          <h2 className="text-4xl font-black text-green-400 mb-4 animate-bounce">LEVEL {level} COMPLETE!</h2>
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
            <p className="text-yellow-300 text-lg mb-6 animate-pulse">NEW RECORD!</p>
          )}
          <button 
            onClick={startGame} 
            className="px-12 py-4 rounded-2xl text-white font-bold text-xl shadow-xl"
            style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}
          >
            RETRY
          </button>
        </div>
      )}
    </div>
  );
}
