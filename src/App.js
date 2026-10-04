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
  const playerXRef = useRef(50);
  const isDraggingRef = useRef(false);
  const isMobileRef = useRef(false);
  const gameStateRef = useRef('start');

  useEffect(() => { playerXRef.current = playerX; }, [playerX]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => {
    isMobileRef.current = window.innerWidth < 900 || /Android|iPhone/i.test(navigator.userAgent);
  }, []);

  const startGame = () => {
    setEnemies([]); setScore(0); setPlayerX(50); playerXRef.current = 50;
    setGameState('playing'); gameStateRef.current = 'playing';
    setModal(null);
    setTimeout(() => window.focus(), 100);
  };

  const moveLeft = () => {
    if (gameStateRef.current!== 'playing' || modal) return;
    const step = isMobileRef.current? 14 : 10;
    let nx = playerXRef.current - step;
    nx = Math.max(10, Math.min(90, nx));
    playerXRef.current = nx;
    setPlayerX(nx);
  };
  const moveRight = () => {
    if (gameStateRef.current!== 'playing' || modal) return;
    const step = isMobileRef.current? 14 : 10;
    let nx = playerXRef.current + step;
    nx = Math.max(10, Math.min(90, nx));
    playerXRef.current = nx;
    setPlayerX(nx);
  };

  const handleMove = (clientX) => {
    if (!gameRef.current || gameStateRef.current!== 'playing' || modal) return;
    const rect = gameRef.current.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;
    x = Math.max(10, Math.min(90, x));
    playerXRef.current = x;
    setPlayerX(x);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (modal) {
        if (e.key === 'Escape') setModal(null);
        return;
      }
      if (gameStateRef.current!== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault(); moveLeft();
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault(); moveRight();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal]);

  // DRAG FIXED - Allow scroll when NOT playing
  useEffect(() => {
    if (modal) { isDraggingRef.current = false; return; }
    const el = gameRef.current;
    if (!el) return;
    // Only block scroll when actually playing
    const isPlayingNow = () => gameStateRef.current === 'playing' &&!modal;

    const down = (e) => {
      if (!isPlayingNow()) return;
      isDraggingRef.current = true;
      handleMove(e.touches? e.touches[0].clientX : e.clientX);
    };
    const move = (e) => {
      if (!isDraggingRef.current ||!isPlayingNow()) return;
      if (e.cancelable) e.preventDefault();
      handleMove(e.touches? e.touches[0].clientX : e.clientX);
    };
    const up = () => { isDraggingRef.current = false; };

    el.addEventListener('mousedown', down);
    el.addEventListener('touchstart', down, { passive: false });
    window.addEventListener('mousemove', move, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    return () => {
      el.removeEventListener('mousedown', down);
      el.removeEventListener('touchstart', down);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
    };
  }, [modal, gameState]);

  useEffect(() => {
    if (gameState!== 'playing') return;
    let frame = 0;
    const loop = () => {
      frame++;
      setEnemies(prev => {
        const baseSpeed = isMobileRef.current? 0.55 : 0.20;
        const speedInc = isMobileRef.current? 0.0009 : 0.00035;
        let next = prev.map(en => ({...en, y: en.y + baseSpeed + score * speedInc })).filter(en => en.y < 112);
        const spawnRate = isMobileRef.current? 0.028 : 0.012;
        if (next.every(en => en.y > 28) && Math.random() < spawnRate) {
          let newX = 15 + Math.random() * 70;
          let tries = 0;
          while (tries < 12 && next.some(en => en.y < 42 && Math.abs(en.x - newX) < 19)) {
            newX = 15 + Math.random() * 70; tries++;
          }
          if (tries < 12) next.push({ id: Date.now()+Math.random(), x: newX, y: -12, color: ['#FF3B30','#FF9500','#FFCC00','#5856D6'][Math.floor(Math.random()*4)] });
        }
        for (let en of next) {
          if (en.y > 74 && en.y < 89 && Math.abs(en.x - playerXRef.current) < 11) {
            setGameState('over'); gameStateRef.current = 'over';
            if (score > best) { setBest(score); localStorage.setItem('best', score); }
            break;
          }
        }
        return next;
      });
      if (frame % 10 === 0) setScore(s => s + 1);
      loopRef.current = requestAnimationFrame(loop);
    };
    loopRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(loopRef.current);
  }, [gameState, score, best]);

  const Car = ({ x, y, color, isPlayer }) => (
    <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', width: '28px', height: '52px', background: color, borderRadius: '6px', zIndex: isPlayer? 20 : 5 }}>
      <div style={{ position: 'absolute', top: '6px', left: '3px', right: '3px', height: '10px', background: '#111', borderRadius: '2px' }} />
    </div>
  );

  const closeModal = () => { setModal(null); setTimeout(()=>window.focus(),50); };

  const Modal = ({ title, children }) => (
    <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#0e2a5a', borderRadius: '12px', maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '20px', position: 'relative', border: '1px solid #2a5db0', pointerEvents: 'auto' }}>
        <button onClick={closeModal} onMouseDown={(e)=>e.stopPropagation()} onTouchStart={(e)=>e.stopPropagation()} style={{ position: 'absolute', top: '10px', right: '12px', background: '#ff3b30', border: 'none', color: 'white', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontWeight: 'bold', zIndex: 100000, pointerEvents: 'auto' }}>X</button>
        <h3 style={{ color: '#00E5FF', marginBottom: '12px' }}>{title}</h3>
        <div style={{ fontSize: '12px', lineHeight: '1.7', color: '#cfe2ff' }}>{children}</div>
        <button onClick={closeModal} style={{ marginTop: '15px', padding: '10px 18px', background: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a1e3f', color: 'white', fontFamily: 'Arial', overflowX: 'hidden' }}>
      <style>{`
    .side-ad{ width:160px; min-height:500px; background:#ffffff18; border:1px dashed #4aa8ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:11px; }
    .bottom-ad-wrap{ width:100%; display:flex; justify-content:center; margin-top:12px; }
    .bottom-ad{ width:300px; height:64px; background:#ffffff15; border:1px dashed #4aa8ff; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:11px; }
    .game-box{ touch-action: pan-y; }
    .game-box.playing{ touch-action: none; }
        @media (max-width: 900px){
         .side-ad{ display:none!important; }
         .game-box{ width:92vw!important; max-width:360px!important; height:62vh!important; }
         .bottom-ad-wrap{ width:92vw!important; max-width:360px!important; margin:12px auto 0 auto; }
         .bottom-ad{ width:100%!important; }
        }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', background: '#06102a', fontSize: '12px' }}>
        <b>FUNBIT GAMES</b>
        <div style={{ display: 'flex', gap: '14px', cursor: 'pointer' }}>
          <span onClick={() => setModal('about')}>About</span><span onClick={() => setModal('privacy')}>Privacy</span><span onClick={() => setModal('contact')}>Contact</span><span onClick={() => setModal('terms')}>Terms</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '12px', flexWrap: 'wrap' }}>
        <div className="side-ad">ADVERTISEMENT</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', width: '300px', maxWidth: '92vw' }}><span>Score: {Math.floor(score)}</span><span>Best: {best}</span></div>
          <div ref={gameRef} className={`game-box ${gameState==='playing'?'playing':''}`} style={{ position: 'relative', width: '300px', height: '480px', background: '#070711', borderRadius: '16px', border: '2px solid #223', overflow: 'hidden', outline: 'none' }}>
            <div style={{ position: 'absolute', left: '50%', top: 0, width: '2px', height: '100%', background: 'repeating-linear-gradient(to bottom, #fff 0 14px, transparent 14px 28px)', transform: 'translateX(-50%)', opacity: 0.35, zIndex: 1 }} />
            {gameState!== 'start' && enemies.map(en => <Car key={en.id} x={en.x} y={en.y} color={en.color} />)}
            {gameState!== 'start' && <Car x={playerX} y={85} color="#00D9FF" isPlayer />}
            {gameState === 'start' && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: '#070711', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h2 style={{ color: '#00E5FF' }}>CAR DODGE</h2>
                <p style={{ fontSize: '11px', color: '#aaa' }}>Use A/D, Arrow Keys or Drag</p>
                <button onClick={startGame} style={{ marginTop: '12px', padding: '10px 24px', background: '#ffeb3b', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>PLAY NOW</button>
              </div>
            )}
            {gameState === 'over' && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.94)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h2 style={{ margin: 0 }}>GAME OVER</h2><p>Score: {Math.floor(score)}</p><button onClick={startGame} style={{ padding: '10px 22px', background: 'white', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' }}>RESTART</button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
            <button onClick={moveLeft} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: '#ffffff22', color: 'white', cursor: 'pointer' }}>← LEFT (A)</button>
            <button onClick={moveRight} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: '#ffffff22', color: 'white', cursor: 'pointer' }}>RIGHT → (D)</button>
          </div>
          <div className="bottom-ad-wrap"><div className="bottom-ad">ADVERTISEMENT</div></div>
        </div>
        <div className="side-ad">ADVERTISEMENT</div>
      </div>

      <div style={{ background: '#06102a', padding: '18px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginBottom: '10px', fontSize: '12px', cursor: 'pointer' }}>
          <span onClick={() => setModal('about')}>About</span><span onClick={() => setModal('privacy')}>Privacy</span><span onClick={() => setModal('contact')}>Contact</span><span onClick={() => setModal('terms')}>Terms</span>
        </div>
        <p style={{ fontSize: '11px', color: '#9ab' }}>© 2026 Funbit Games Studio, Chakan, Pune - 411501</p>
      </div>

      {modal === 'about' && <Modal title="About FunBit Games Studio"><p>Welcome to FunBit Games Studio! We are an independent game development studio based in Chakan, Pune. Lightweight instant games.</p></Modal>}
      {modal === 'privacy' && <Modal title="Privacy Policy - Last updated October 3, 2026"><p>We do NOT collect personal info. localStorage for best score only. Hosted on Vercel.</p></Modal>}
      {modal === 'contact' && <Modal title="Contact Us"><p>Email: funbitgames.studio@gmail.com<br/>Chakan, Pune - 410501</p></Modal>}
      {modal === 'terms' && <Modal title="Terms"><p>Free to play, as-is.</p></Modal>}
    </div>
  );
}