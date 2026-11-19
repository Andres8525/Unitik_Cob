import { useEffect, useRef } from 'react';

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Hubs represent radio towers / OLTs: bigger, glowing and emitting waves. */
  hub: boolean;
  phase: number;
}

interface DataPacket {
  from: number;
  to: number;
  progress: number;
  speed: number;
  color: string;
}

const LINK_DISTANCE = 170;
const PACKET_COLORS = ['#22d3ee', '#4ade80', '#a3e635', '#60a5fa'];
const MAX_PACKETS = 40;

function createNodes(width: number, height: number): NetworkNode[] {
  const count = Math.round(Math.min(90, Math.max(28, (width * height) / 16_000)));
  return Array.from({ length: count }, (_, index) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    hub: index % 9 === 0,
    phase: Math.random(),
  }));
}

/**
 * Animated telecom network backdrop: fiber/radio nodes linked by proximity,
 * data packets travelling through the links and radio waves pulsing from hubs.
 * Purely decorative (aria-hidden) and static when the user prefers reduced motion.
 */
export default function TelecomBackground({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let nodes: NetworkNode[] = [];
    let packets: DataPacket[] = [];
    let animationFrame = 0;
    let tick = 0;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      nodes = createNodes(width, height);
      packets = [];
    };

    const spawnPacket = () => {
      const from = Math.floor(Math.random() * nodes.length);
      const origin = nodes[from];
      const neighbours = nodes
        .map((node, index) => ({ index, distance: Math.hypot(node.x - origin.x, node.y - origin.y) }))
        .filter(({ index, distance }) => index !== from && distance < LINK_DISTANCE);
      if (neighbours.length === 0) return;
      const target = neighbours[Math.floor(Math.random() * neighbours.length)];
      packets.push({
        from,
        to: target.index,
        progress: 0,
        speed: 0.008 + Math.random() * 0.012,
        color: PACKET_COLORS[Math.floor(Math.random() * PACKET_COLORS.length)],
      });
    };

    const drawFrame = () => {
      context.clearRect(0, 0, width, height);

      // Links between nearby nodes (fiber / radio backhaul)
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > LINK_DISTANCE) continue;
          const strength = 1 - distance / LINK_DISTANCE;
          context.strokeStyle = `rgba(56, 189, 248, ${strength * (a.hub || b.hub ? 0.45 : 0.25)})`;
          context.lineWidth = a.hub || b.hub ? 1.2 : 0.7;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }

      // Radio waves from hubs
      for (const node of nodes) {
        if (!node.hub) continue;
        for (let ring = 0; ring < 3; ring += 1) {
          const cycle = (tick * 0.006 + node.phase + ring / 3) % 1;
          context.strokeStyle = `rgba(74, 222, 128, ${(1 - cycle) * 0.35})`;
          context.lineWidth = 1;
          context.beginPath();
          context.arc(node.x, node.y, 6 + cycle * 70, 0, Math.PI * 2);
          context.stroke();
        }
      }

      // Nodes
      for (const node of nodes) {
        const radius = node.hub ? 4 : 1.8;
        if (node.hub) {
          const glow = context.createRadialGradient(node.x, node.y, 0, node.x, node.y, 18);
          glow.addColorStop(0, 'rgba(34, 211, 238, 0.55)');
          glow.addColorStop(1, 'rgba(34, 211, 238, 0)');
          context.fillStyle = glow;
          context.beginPath();
          context.arc(node.x, node.y, 18, 0, Math.PI * 2);
          context.fill();
        }
        context.fillStyle = node.hub ? '#a5f3fc' : 'rgba(191, 219, 254, 0.8)';
        context.beginPath();
        context.arc(node.x, node.y, radius, 0, Math.PI * 2);
        context.fill();
      }

      // Data packets travelling along links
      for (const packet of packets) {
        const from = nodes[packet.from];
        const to = nodes[packet.to];
        const x = from.x + (to.x - from.x) * packet.progress;
        const y = from.y + (to.y - from.y) * packet.progress;
        context.shadowColor = packet.color;
        context.shadowBlur = 12;
        context.fillStyle = packet.color;
        context.beginPath();
        context.arc(x, y, 2.4, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }
    };

    const update = () => {
      tick += 1;
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }
      packets = packets.filter((packet) => {
        packet.progress += packet.speed;
        const from = nodes[packet.from];
        const to = nodes[packet.to];
        // Drop packets whose link broke while the nodes drifted apart
        return packet.progress < 1 && Math.hypot(from.x - to.x, from.y - to.y) < LINK_DISTANCE * 1.1;
      });
      if (packets.length < MAX_PACKETS && Math.random() < 0.35) spawnPacket();
    };

    const loop = () => {
      update();
      drawFrame();
      animationFrame = window.requestAnimationFrame(loop);
    };

    resize();
    if (reduceMotion) {
      for (let i = 0; i < 12; i += 1) spawnPacket();
      drawFrame();
    } else {
      loop();
    }

    const handleResize = () => {
      resize();
      if (reduceMotion) drawFrame();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-unitik-950 to-slate-900" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-emerald-500/15 blur-3xl" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
