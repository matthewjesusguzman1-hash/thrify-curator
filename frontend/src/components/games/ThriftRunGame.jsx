import { useState, useEffect, useCallback, useRef } from "react";
import { X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ShoppingCart, Trophy, Heart, Shirt } from "lucide-react";

// Game constants
const TILE_SIZE = 32;
const GAME_WIDTH = 11;
const GAME_HEIGHT = 13;

// Tile types
const TILES = {
  EMPTY: 0,
  RACK: 1,
  PLAYER: 2,
  KAREN: 3,
  HOMELESS: 4,
  CLOTHING: 5,
  CHECKOUT: 6,
  WALL: 7,
};

// Initial level layout
const createLevel = (level) => {
  // Base maze pattern - 1 = rack/wall, 0 = path
  const baseMap = [
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
    [7, 0, 0, 0, 1, 0, 0, 0, 1, 0, 7],
    [7, 0, 1, 0, 1, 0, 1, 0, 0, 0, 7],
    [7, 0, 1, 0, 0, 0, 1, 1, 1, 0, 7],
    [7, 0, 0, 0, 1, 0, 0, 0, 0, 0, 7],
    [7, 1, 1, 0, 1, 1, 1, 0, 1, 0, 7],
    [7, 0, 0, 0, 0, 0, 0, 0, 1, 0, 7],
    [7, 0, 1, 1, 1, 0, 1, 0, 0, 0, 7],
    [7, 0, 0, 0, 1, 0, 1, 1, 1, 0, 7],
    [7, 1, 1, 0, 0, 0, 0, 0, 0, 0, 7],
    [7, 0, 0, 0, 1, 1, 1, 0, 1, 0, 7],
    [7, 0, 1, 0, 0, 0, 0, 0, 0, 0, 7],
    [7, 7, 7, 7, 7, 6, 6, 7, 7, 7, 7],
  ];
  
  return baseMap;
};

// Generate random positions for enemies and items
const generateEntities = (map, level) => {
  const entities = {
    karens: [],
    homeless: [],
    clothing: [],
  };
  
  const emptySpots = [];
  for (let y = 1; y < GAME_HEIGHT - 1; y++) {
    for (let x = 1; x < GAME_WIDTH - 1; x++) {
      if (map[y][x] === TILES.EMPTY && !(x === 1 && y === 1)) {
        emptySpots.push({ x, y });
      }
    }
  }
  
  // Shuffle empty spots
  for (let i = emptySpots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [emptySpots[i], emptySpots[j]] = [emptySpots[j], emptySpots[i]];
  }
  
  // Add Karens (increases with level)
  const karenCount = Math.min(2 + level, 5);
  for (let i = 0; i < karenCount && emptySpots.length > 0; i++) {
    const spot = emptySpots.pop();
    entities.karens.push({ ...spot, dir: Math.random() > 0.5 ? 1 : -1 });
  }
  
  // Add homeless (increases with level)
  const homelessCount = Math.min(1 + Math.floor(level / 2), 3);
  for (let i = 0; i < homelessCount && emptySpots.length > 0; i++) {
    const spot = emptySpots.pop();
    entities.homeless.push({ ...spot, dir: Math.random() > 0.5 ? 1 : -1 });
  }
  
  // Add clothing items
  const clothingCount = Math.min(3 + level, 8);
  for (let i = 0; i < clothingCount && emptySpots.length > 0; i++) {
    const spot = emptySpots.pop();
    entities.clothing.push({ ...spot, collected: false });
  }
  
  return entities;
};

export default function ThriftRunGame({ onClose }) {
  const [gameState, setGameState] = useState("start"); // start, playing, won, lost
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [map, setMap] = useState(() => createLevel(1));
  const [entities, setEntities] = useState(() => generateEntities(createLevel(1), 1));
  const [itemsCollected, setItemsCollected] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("thriftrun_highscore");
    return saved ? parseInt(saved) : 0;
  });
  
  const gameLoopRef = useRef(null);
  const lastMoveRef = useRef(0);

  // Start new game
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

  // Next level
  const nextLevel = useCallback(() => {
    const newLevel = level + 1;
    const newMap = createLevel(newLevel);
    setMap(newMap);
    setEntities(generateEntities(newMap, newLevel));
    setPlayer({ x: 1, y: 1 });
    setLevel(newLevel);
    setItemsCollected(0);
    setScore(s => s + 500); // Bonus for completing level
  }, [level]);

  // Move player
  const movePlayer = useCallback((dx, dy) => {
    if (gameState !== "playing") return;
    
    const now = Date.now();
    if (now - lastMoveRef.current < 150) return; // Rate limit moves
    lastMoveRef.current = now;
    
    setPlayer(prev => {
      const newX = prev.x + dx;
      const newY = prev.y + dy;
      
      // Check bounds and walls
      if (newX < 0 || newX >= GAME_WIDTH || newY < 0 || newY >= GAME_HEIGHT) {
        return prev;
      }
      
      const tile = map[newY][newX];
      if (tile === TILES.RACK || tile === TILES.WALL) {
        return prev;
      }
      
      // Check for checkout (win condition)
      if (tile === TILES.CHECKOUT) {
        setGameState("levelComplete");
        return prev;
      }
      
      return { x: newX, y: newY };
    });
  }, [gameState, map]);

  // Check collisions with enemies
  useEffect(() => {
    if (gameState !== "playing") return;
    
    // Check Karen collisions
    for (const karen of entities.karens) {
      if (karen.x === player.x && karen.y === player.y) {
        setLives(l => {
          const newLives = l - 1;
          if (newLives <= 0) {
            setGameState("lost");
            if (score > highScore) {
              setHighScore(score);
              localStorage.setItem("thriftrun_highscore", score.toString());
            }
          } else {
            // Reset player position
            setPlayer({ x: 1, y: 1 });
          }
          return newLives;
        });
        return;
      }
    }
    
    // Check homeless collisions
    for (const h of entities.homeless) {
      if (h.x === player.x && h.y === player.y) {
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
        return;
      }
    }
    
    // Check clothing collection
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
        // Move Karens horizontally
        const newKarens = prev.karens.map(karen => {
          let newX = karen.x + karen.dir;
          
          // Check if can move
          if (newX < 1 || newX >= GAME_WIDTH - 1 || 
              map[karen.y][newX] === TILES.RACK || 
              map[karen.y][newX] === TILES.WALL) {
            return { ...karen, dir: -karen.dir };
          }
          
          return { ...karen, x: newX };
        });
        
        // Move homeless vertically
        const newHomeless = prev.homeless.map(h => {
          let newY = h.y + h.dir;
          
          if (newY < 1 || newY >= GAME_HEIGHT - 1 || 
              map[newY][h.x] === TILES.RACK || 
              map[newY][h.x] === TILES.WALL) {
            return { ...h, dir: -h.dir };
          }
          
          return { ...h, y: newY };
        });
        
        return { ...prev, karens: newKarens, homeless: newHomeless };
      });
    };
    
    gameLoopRef.current = setInterval(moveEnemies, 500 - Math.min(level * 30, 200));
    
    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState, level, map]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== "playing") return;
      
      switch (e.key) {
        case "ArrowUp":
        case "w":
          e.preventDefault();
          movePlayer(0, -1);
          break;
        case "ArrowDown":
        case "s":
          e.preventDefault();
          movePlayer(0, 1);
          break;
        case "ArrowLeft":
        case "a":
          e.preventDefault();
          movePlayer(-1, 0);
          break;
        case "ArrowRight":
        case "d":
          e.preventDefault();
          movePlayer(1, 0);
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, movePlayer]);

  // Level complete handler
  useEffect(() => {
    if (gameState === "levelComplete") {
      const timer = setTimeout(() => {
        nextLevel();
        setGameState("playing");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState, nextLevel]);

  // Render game tile
  const renderTile = (tileType, x, y) => {
    const isPlayer = player.x === x && player.y === y;
    const karen = entities.karens.find(k => k.x === x && k.y === y);
    const homeless = entities.homeless.find(h => h.x === x && h.y === y);
    const clothing = entities.clothing.find(c => c.x === x && c.y === y && !c.collected);
    
    let bgColor = "bg-amber-100"; // Floor
    let content = null;
    
    if (tileType === TILES.WALL) {
      bgColor = "bg-stone-800";
    } else if (tileType === TILES.RACK) {
      bgColor = "bg-amber-200";
      content = (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-6 h-5 bg-amber-700 rounded-sm flex items-center justify-center shadow-md">
            <div className="w-4 h-3 bg-gradient-to-b from-pink-400 via-blue-400 to-green-400 rounded-sm" />
          </div>
        </div>
      );
    } else if (tileType === TILES.CHECKOUT) {
      bgColor = "bg-green-400";
      content = (
        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-green-900 animate-pulse">
          EXIT
        </div>
      );
    }
    
    // Entities (layered on top)
    if (isPlayer) {
      content = (
        <div className="w-full h-full flex items-center justify-center z-10">
          <div className="relative">
            <ShoppingCart className="w-5 h-5 text-cyan-600 drop-shadow-lg" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
          </div>
        </div>
      );
    } else if (karen) {
      content = (
        <div className="w-full h-full flex items-center justify-center animate-bounce">
          <div className="text-lg" title="Karen">👩‍🦳</div>
        </div>
      );
    } else if (homeless) {
      content = (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-lg animate-pulse" title="Watch out!">🧔</div>
        </div>
      );
    } else if (clothing) {
      content = (
        <div className="w-full h-full flex items-center justify-center">
          <Shirt className="w-4 h-4 text-purple-500 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      );
    }
    
    return (
      <div
        key={`${x}-${y}`}
        className={`${bgColor} border border-amber-300/30 relative`}
        style={{ width: TILE_SIZE, height: TILE_SIZE }}
      >
        {content}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white z-50"
      >
        <X className="w-6 h-6" />
      </button>
      
      {/* Game title */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 font-mono">
          THRIFT RUN
        </h1>
        <p className="text-xs text-gray-400">Navigate to checkout! Avoid Karens & obstacles!</p>
      </div>
      
      {/* HUD */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        <div className="flex items-center gap-1 px-3 py-1 bg-purple-900/50 rounded-full">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-mono">{score}</span>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-red-900/50 rounded-full">
          {[...Array(3)].map((_, i) => (
            <Heart
              key={i}
              className={`w-4 h-4 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-cyan-900/50 rounded-full">
          <Shirt className="w-4 h-4 text-cyan-400" />
          <span className="text-cyan-400 font-mono">{itemsCollected}</span>
        </div>
        <div className="px-3 py-1 bg-green-900/50 rounded-full">
          <span className="text-green-400 font-mono text-xs">LVL {level}</span>
        </div>
      </div>
      
      {/* High score */}
      <div className="mb-2 text-xs text-gray-500">
        High Score: <span className="text-yellow-500 font-mono">{highScore}</span>
      </div>
      
      {/* Game board */}
      <div 
        className="border-4 border-amber-700 rounded-lg overflow-hidden shadow-2xl"
        style={{ 
          width: GAME_WIDTH * TILE_SIZE + 8,
          height: GAME_HEIGHT * TILE_SIZE + 8,
          background: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)'
        }}
      >
        <div className="p-1">
          {map.map((row, y) => (
            <div key={y} className="flex">
              {row.map((tile, x) => renderTile(tile, x, y))}
            </div>
          ))}
        </div>
      </div>
      
      {/* D-Pad Controls */}
      <div className="mt-6 relative" style={{ width: 140, height: 140 }}>
        {/* Up */}
        <button
          onTouchStart={() => movePlayer(0, -1)}
          onClick={() => movePlayer(0, -1)}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg flex items-center justify-center active:from-gray-600 active:to-gray-700 shadow-lg border border-gray-600"
        >
          <ArrowUp className="w-6 h-6 text-white" />
        </button>
        
        {/* Down */}
        <button
          onTouchStart={() => movePlayer(0, 1)}
          onClick={() => movePlayer(0, 1)}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg flex items-center justify-center active:from-gray-600 active:to-gray-700 shadow-lg border border-gray-600"
        >
          <ArrowDown className="w-6 h-6 text-white" />
        </button>
        
        {/* Left */}
        <button
          onTouchStart={() => movePlayer(-1, 0)}
          onClick={() => movePlayer(-1, 0)}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg flex items-center justify-center active:from-gray-600 active:to-gray-700 shadow-lg border border-gray-600"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        
        {/* Right */}
        <button
          onTouchStart={() => movePlayer(1, 0)}
          onClick={() => movePlayer(1, 0)}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg flex items-center justify-center active:from-gray-600 active:to-gray-700 shadow-lg border border-gray-600"
        >
          <ArrowRight className="w-6 h-6 text-white" />
        </button>
        
        {/* Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-gray-900 rounded-full border-2 border-gray-700" />
      </div>
      
      {/* Start Screen Overlay */}
      {gameState === "start" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 mb-4 font-mono">
            THRIFT RUN
          </h2>
          <div className="text-gray-400 text-sm mb-6 text-center px-8">
            <p className="mb-2">Navigate the thrift store maze!</p>
            <p className="mb-1">👩‍🦳 Avoid Karens blocking aisles</p>
            <p className="mb-1">🧔 Watch out for obstacles</p>
            <p className="mb-1">👕 Collect clothing for bonus points</p>
            <p>🚪 Reach the EXIT to advance!</p>
          </div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full text-white font-bold text-lg hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg"
          >
            START GAME
          </button>
        </div>
      )}
      
      {/* Level Complete Overlay */}
      {gameState === "levelComplete" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
          <h2 className="text-3xl font-bold text-green-400 mb-4 animate-bounce">
            LEVEL {level} COMPLETE!
          </h2>
          <p className="text-gray-400">Get ready for Level {level + 1}...</p>
        </div>
      )}
      
      {/* Game Over Overlay */}
      {gameState === "lost" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
          <h2 className="text-3xl font-bold text-red-500 mb-4">GAME OVER</h2>
          <p className="text-gray-400 mb-2">Final Score: <span className="text-yellow-400">{score}</span></p>
          {score >= highScore && score > 0 && (
            <p className="text-yellow-400 mb-4 animate-pulse">NEW HIGH SCORE!</p>
          )}
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full text-white font-bold text-lg hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg"
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
