// public/js/particles.js
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

function fitCanvas(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
fitCanvas();
window.addEventListener('resize', () => { fitCanvas(); initParticles(); });

const mouse = { x: null, y: null, radius: 150 };
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

class Particle {
  constructor(x,y,dx,dy,size,color){
    this.x = x; this.y = y; this.directionX = dx; this.directionY = dy;
    this.size = size; this.color = color;
  }
  draw(){
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.size,0,Math.PI*2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
  update(){
    if(this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
    if(this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;

    if(mouse.x && mouse.y){
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if(dist < mouse.radius + this.size){
        if(mouse.x < this.x && this.x < canvas.width - this.size*10) this.x += 2;
        if(mouse.x > this.x && this.x > this.size*10) this.x -= 2;
        if(mouse.y < this.y && this.y < canvas.height - this.size*10) this.y += 2;
        if(mouse.y > this.y && this.y > this.size*10) this.y -= 2;
      }
    }

    this.x += this.directionX;
    this.y += this.directionY;
    this.draw();
  }
}

let particlesArray = [];

function initParticles(){
  particlesArray = [];
  const area = canvas.width * canvas.height;
  // medium density: area / 8000
  const numberOfParticles = Math.max(40, Math.floor(area / 8000));
  for(let i=0;i<numberOfParticles;i++){
    const size = (Math.random()*2.2)+0.6;
    const x = Math.random() * (canvas.width - size*4) + size*2;
    const y = Math.random() * (canvas.height - size*4) + size*2;
    const dx = (Math.random()*1.6)-0.8; const dy = (Math.random()*1.6)-0.8;
    const color = Math.random() > 0.55 ? '#714B67' : '#00E88F';
    particlesArray.push(new Particle(x,y,dx,dy,size,color));
  }
}

function connect(){
  for(let a=0;a<particlesArray.length;a++){
    for(let b=a;b<particlesArray.length;b++){
      const dx = particlesArray[a].x - particlesArray[b].x;
      const dy = particlesArray[a].y - particlesArray[b].y;
      const dist = dx*dx + dy*dy;
      if(dist < (canvas.width/8)*(canvas.height/8)){
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
        ctx.stroke();
      }
    }
  }
}

function animateParticles(){
  requestAnimationFrame(animateParticles);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(const p of particlesArray) p.update();
  connect();
}

initParticles();
animateParticles();
