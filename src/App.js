/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';

export default function App() {
  const [playerX, setPlayerX] = useState(50);
  const [enemies, setEnemies] = useState([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem('best') || 0));
  const [gameState, setGameState] = useState('start');
  const [modal, setModal] = useState(null);

  const gameRef = useRef(null);
  const loopRef = useRef();
  const playerXRef = useRef(50); // NEW - lag free ref
  const isDraggingRef = useRef(false);

  useEffect(() => { playerXRef.current = playerX; }, [playerX]);

  const startGame = () => {
    setEnemies([]); setScore(0); setPlayerX(50); playerXRef.current = 50; setGameState('playing');
  };

  // OPTIMIZED MOVE - updates ref instantly, state throttled
  const handleMove = (clientX) => {
    if (!gameRef.current || gameState!== 'playing') return;
    const rect = gameRef.current.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;
    x = Math.max(8, Math.min(92, x));
    playerXRef.current = x; // instant
    setPlayerX(x); // for render
  };

  // MOUSE + TOUCH unified with preventDefault
  useEffect(() => {
    const el = gameRef.current;
    if (!el) return;

    const onPointerDown = (e) => {
      isDraggingRef.current = true;
      const cx = e.touches? e.touches[0].clientX : e.clientX;
      handleMove(cx);
    };
    const onPointerMove = (e) => {
      if (!isDraggingRef.current) return;
      if (e.cancelable) e.preventDefault();
      const cx = e.touches? e.touches[0].clientX : e.clientX;
      handleMove(cx);
    };
    const onPointerUp = () => { isDraggingRef.current = false; };

    el.addEventListener('mousedown', onPointerDown);
    el.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchend', onPointerUp);

    return () => {
      el.removeEventListener('mousedown', onPointerDown);
      el.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [gameState]);

  useEffect(() => {
    const keyHandler = (e) => {
      if (gameState!== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        const nx = Math.max(8, playerXRef.current - 7);
        playerXRef.current = nx; setPlayerX(nx);
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        const nx = Math.min(92, playerXRef.current + 7);
        playerXRef.current = nx; setPlayerX(nx);
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [gameState]);

  // FIXED LOOP - NO playerX dependency!
  useEffect(() => {
    if (gameState!== 'playing') return;
    let frame = 0;
    const loop = () => {
      frame++;
      setEnemies(prev => {
        let next = prev.map(en => ({...en, y: en.y + 0.5 + score * 0.0008 })).filter(en => en.y < 115);
        const canSpawn = next.every(en => en.y > 22);
        if (canSpawn && Math.random() < 0.025) {
          let newX = 15 + Math.random() * 70;
          let attempts = 0;
          let hasCollision = true;
          while (hasCollision && attempts < 10) {
            newX = 15 + Math.random() * 70;
            attempts++;
            hasCollision = next.some(en => en.y < 35 && Math.abs(en.x - newX) < 18);
            if (next.length === 0) hasCollision = false;
          }
          if (attempts < 10) {
            next.push({ id: Date.now() + Math.random(), x: newX, y: -12, color: ['#FF3B30', '#FF9500', '#FFCC00', '#5856D6'][Math.floor(Math.random() * 4)] });
          }
        }
        // USE REF FOR COLLISION - no lag
        for (let i = 0; i < next.length; i++) {
          const en = next[i];
          if (en.y > 75 && en.y < 90 && Math.abs(en.x - playerXRef.current) < 10) {
            setGameState('over');
            if (score > best) { setBest(score); localStorage.setItem('best', score); }
          }
        }
        return next;
      });
      if (frame % 8 === 0) setScore(s => s + 1);
      loopRef.current = requestAnimationFrame(loop);
    };
    loopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(loopRef.current);
  }, [gameState, score, best]); // REMOVED playerX!

  const Car = ({ x, y, color, isPlayer }) => (
  <div style={{ 
    position: 'absolute', 
    left: `${x}%`, 
    top: `${y}%`, 
    transform: 'translate(-50%,-50%) translateZ(0)', 
    width: '30px', 
    height: '54px', 
    background: color, 
    borderRadius: '6px', 
    boxShadow: '0 4px 0 rgba(0,0,0,0.4)', 
    zIndex: isPlayer ? 10 : 5, // <-- car is ABOVE road
    border: isPlayer ? '1.5px solid #00ffff' : 'none'
  }}>
    <div style={{ position: 'absolute', top: '6px', left: '4px', right: '4px', height: '12px', background: '#0a0a0a', borderRadius: '3px', border: '1px solid #333' }} />
    <div style={{ position: 'absolute', bottom: '6px', left: '4px', right: '4px', height: '6px', background: '#00000066', borderRadius: '2px' }} />
    </div>
  );

  const Modal = ({ title, children }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
      <div style={{ background: '#0e2a5a', borderRadius: '12px', maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '20px', position: 'relative', border: '1px solid #2a5db0' }}>
        <button onClick={() => setModal(null)} style={{ position: 'absolute', top: '10px', right: '12px', background: '#ffffff22', border: 'none', color: 'white', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>X</button>
        <h3 style={{ color: '#00E5FF', marginBottom: '12px' }}>{title}</h3>
        <div style={{ fontSize: '12px', lineHeight: '1.7', color: '#cfe2ff' }}>{children}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a1e3f', color: 'white', fontFamily: 'Arial' }}>
      <style>{`
       .side-ad { width: 160px; min-height: 400px; background: #ffffff18; border: 1px dashed #4aa8ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 11px; }
        @media (max-width: 900px) {
         .side-ad { display: none!important; } /* HIDE upper/side ads on mobile */
         .game-container { width: 100vw!important; }
         .game-box { width: 95vw!important; max-width: 360px!important; height: 65vh!important; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', background: '#06102a', fontSize: '12px' }}>
        <b>FUNBIT GAMES</b>
        <div style={{ display: 'flex', gap: '14px', cursor: 'pointer' }}>
          <span onClick={() => setModal('about')}>About</span>
          <span onClick={() => setModal('privacy')}>Privacy</span>
          <span onClick={() => setModal('contact')}>Contact</span>
          <span onClick={() => setModal('terms')}>Terms</span>
        </div>
      </div>

      <div className="game-container" style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '12px', flexWrap: 'wrap' }}>
        <div className="side-ad">ADVERTISEMENT</div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}><span>Score: {Math.floor(score)}</span><span>Best: {best}</span></div>
          <div ref={gameRef} className="game-box"
            style={{ position: 'relative', width: '300px', height: '480px', background: '#0a0a1a', borderRadius: '16px', border: '2px solid #223', overflow: 'hidden', touchAction: 'none', cursor: 'grab' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, width: '2px', height: '100%', background: 'repeating-linear-gradient(to bottom, white 0 12px, transparent 12px 24px)', transform: 'translateX(-50%)', opacity: 0.4, zIndex: 1 }} />
            {gameState!== 'start' && enemies.map(en => <Car key={en.id} x={en.x} y={en.y} color={en.color} />)}
            {gameState!== 'start' && <Car x={playerX} y={85} color="#00D9FF" isPlayer />}
            {gameState === 'start' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
                <h2 style={{ color: '#00E5FF' }}>CAR DODGE</h2>
                <p style={{ fontSize: '12px', color: '#ccc' }}>Dodge the cars! Drag to Move!</p>
                <button onClick={startGame} style={{ marginTop: '15px', padding: '10px 24px', background: '#ffeb3b', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>PLAY NOW</button>
              </div>
            )}
            {gameState === 'over' && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h2>GAME OVER</h2><p>Score: {Math.floor(score)}</p>
                <button onClick={startGame} style={{ padding: '8px 20px', background: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>RESTART</button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
            <button onTouchStart={() => { const nx = Math.max(8, playerXRef.current - 15); playerXRef.current = nx; setPlayerX(nx); }} style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: '#ffffff22', color: 'white' }}>← LEFT</button>
            <button onTouchStart={() => { const nx = Math.min(92, playerXRef.current + 15); playerXRef.current = nx; setPlayerX(nx); }} style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: '#ffffff22', color: 'white' }}>RIGHT →</button>
          </div>
          <div style={{ marginTop: '10px', width: '300px', height: '70px', background: '#ffffff15', border: '1px dashed #4aa8ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>ADVERTISEMENT</div>
        </div>
        <div className="side-ad">ADVERTISEMENT</div>
      </div>

      <div style={{ background: '#06102a', padding: '20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginBottom: '10px', fontSize: '12px', cursor: 'pointer' }}>
          <span onClick={() => setModal('about')}>About</span><span onClick={() => setModal('privacy')}>Privacy Policy</span><span onClick={() => setModal('contact')}>Contact</span><span onClick={() => setModal('terms')}>Terms & Conditions</span>
        </div>
        <p style={{ fontSize: '11px', color: '#9ab' }}>© 2026 Funbit Games Studio, Chakan, Pune, Maharashtra, India - 411501</p>
      </div>

      {modal === 'about' && <Modal title="About FunBit Games Studio">
        <p>Welcome to FunBit Games Studio! We are an independent game development studio based in Chakan, Pune, Maharashtra, India.</p>
        <b>Our Story</b><br/>Founded by a small team of passionate gamers and developers from Maharashtra, our mission is to create fun, lightweight, and addictive games that anyone can play instantly without downloading heavy apps.<br/><br/>
        <b>Our Mission</b><br/>We believe gaming should be accessible to everyone. Our games are lightweight, fast, and work on all devices.<br/><br/>
        <b>Why FunBit?</b><br/>No download required, instant play, optimized for mobile and PC.<br/><br/>© 2026 FunBit Games Studio.
      </Modal>}

      {modal === 'privacy' && <Modal title="Privacy Policy - Last updated October 3, 2026">
        At FunBit Games Studio, we take your privacy seriously.<br/><br/>
        <b>1. Information We Collect</b><br/>We do NOT collect personal information like name, email, phone directly. We use localStorage to save your high score on your device only.<br/><br/>
        <b>2. Cookies & Ads</b><br/>We may show ads in future.<br/><br/>
        <b>3. Third Party Services</b><br/>Our game is hosted on Vercel. Vercel may collect anonymous log data like IP, browser for security and performance.<br/><br/>
        <b>4. Children's Privacy</b><br/>Our games are safe for all ages, no violent or adult content. We do not knowingly collect data from children under 13.<br/><br/>
        <b>5. Contact</b><br/>If you have any privacy questions, contact us at funbitgames.studio@gmail.com. Address: Chakan, Pune, Maharashtra, India.
      </Modal>}

      {modal === 'contact' && <Modal title="Contact Us">
        Have feedback, bug report, or business inquiry? We would love to hear from you!<br/><br/>
        <b>Email:</b> funbitgames.studio@gmail.com<br/>
        <b>Studio Name:</b> FunBit Games Studio<br/>
        <b>Location:</b> Chakan, Shikrapur Road, Pune, Maharashtra, India - 410501<br/><br/>
        We usually reply within 24 hours!
      </Modal>}

      {modal === 'terms' && <Modal title="Terms and Conditions">
        By playing Car Dodge on dodge-car-gamesworld.app, you agree to these terms.<br/><br/>
        <b>1. Use</b><br/>Game is provided as is for entertainment only, free to play, no warranty.<br/><br/>
        <b>2. Intellectual Property</b><br/>Car Dodge and FunBit Games logo are owned by FunBit Games Studio. You may not copy or resell.<br/><br/>
        <b>3. Limitation</b><br/>We are not liable for any damages from playing game.<br/><br/>
        Last updated: Oct 3, 2026
      </Modal>}
    </div>
  );
}
}