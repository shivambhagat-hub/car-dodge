import { useState, useEffect, useRef } from 'react';

export default function App() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);

  const car = useRef({x:160,y:460});
  const obs = useRef([]);
  const keys = useRef({});
  const speed = useRef(3);
  const scoreRef = useRef(0); // FIXED: Use ref for score
  const animRef = useRef(null);

  useEffect(()=>{
    const c=canvasRef.current;
    const ctx=c.getContext('2d');

    const draw=()=>{
      ctx.clearRect(0,0,360,550);
      ctx.fillStyle='#1e293b'; // Matches your site color #0f172a
      ctx.fillRect(0,0,360,550);

      // Road lines
      ctx.fillStyle='#fff';
      for(let i=0;i<550;i+=40) ctx.fillRect(175, i+(Date.now()/5)%40, 6, 20);

      // Controls - FIXED
      if(keys.current['ArrowLeft'] || keys.current['a'] || keys.current['A']) car.current.x-=6;
      if(keys.current['ArrowRight'] || keys.current['d'] || keys.current['D']) car.current.x+=6;
      car.current.x=Math.max(0,Math.min(320,car.current.x));

      // Car
      ctx.fillStyle='#38bdf8'; // Your theme color
      ctx.fillRect(car.current.x, car.current.y, 40, 70);

      // Obstacles
      if(Math.random()<0.03) obs.current.push({x:Math.random()*300,y:-70});

      obs.current.forEach(o=>{
        o.y+=speed.current;
        ctx.fillStyle='#ef4444';
        ctx.fillRect(o.x,o.y,40,70);
        // Collision
        if(o.x<car.current.x+40 && o.x+40>car.current.x && o.y<car.current.y+70 && o.y+70>car.current.y){
          setOver(true);
        }
      });

      // Remove off-screen + score - FIXED
      obs.current = obs.current.filter(o=>{
        if(o.y>550){
          scoreRef.current += 1;
          setScore(scoreRef.current);
          if(scoreRef.current % 10 === 0) speed.current+=0.5;
          return false;
        }
        return true;
      });

      if(!over){
        animRef.current = requestAnimationFrame(draw);
      } else {
        ctx.fillStyle='rgba(0,0,0,0.7)';
        ctx.fillRect(0,0,360,550);
        ctx.fillStyle='#fff';
        ctx.font='bold 30px system-ui';
        ctx.fillText('GAME OVER',85,280);
        ctx.font='16px system-ui';
        ctx.fillText(`Score: ${scoreRef.current}`,135,310);
      }
    };

    draw();

    const kd=e=>{ keys.current[e.key]=true; },
          ku=e=>{ keys.current[e.key]=false; };

    window.addEventListener('keydown',kd);
    window.addEventListener('keyup',ku);

    return()=>{
      window.removeEventListener('keydown',kd);
      window.removeEventListener('keyup',ku);
      if(animRef.current) cancelAnimationFrame(animRef.current);
    };
  },[over]); // FIXED: Only 'over' dependency, not score!

  const restart = () => {
    obs.current=[];
    scoreRef.current=0;
    setScore(0);
    speed.current=3;
    car.current.x=160;
    setOver(false);
  };

  return(
    <div style={{background:'#0f172a',minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',color:'#e2e8f0',paddingTop:20, fontFamily:'system-ui'}}>
      <h2 style={{color:'#38bdf8'}}>🚗 CAR DODGE - Score: {score}</h2>
      <canvas ref={canvasRef} width={360} height={550}
        style={{border:'2px solid #334155',borderRadius:12,background:'#000',touchAction:'none'}}
        onTouchMove={e=>{
          const r=canvasRef.current.getBoundingClientRect();
          car.current.x = e.touches[0].clientX - r.left - 20;
        }}
      />
      <p style={{color:'#94a3b8', fontSize:14}}>Use ← → or A D - Drag on mobile</p>
      {over && <button onClick={restart} style={{marginTop:12,padding:'12px 28px',background:'#38bdf8',color:'#020617',border:'none',borderRadius:8,fontWeight:'800',cursor:'pointer', letterSpacing:1}}>RESTART</button>}
    </div>
  );
}