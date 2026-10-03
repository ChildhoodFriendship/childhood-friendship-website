import * as THREE from 'three';
import type { ProjectExhibit } from './projects.data';

/** Texture generate su canvas 2D per schermi e quadri della galleria. */
export function createWebsiteTexture(title: string, category: string, accentColor: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  const hexColor = '#' + accentColor.toString(16).padStart(6, '0');

  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 640);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 640);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 1024, 60);

  const dots = ['#ef4444', '#eab308', '#22c55e'];
  dots.forEach((dot, idx) => {
    ctx.beginPath();
    ctx.arc(35 + idx * 26, 30, 8, 0, Math.PI * 2);
    ctx.fillStyle = dot;
    ctx.fill();
  });

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(140, 14, 460, 32, 8);
  ctx.fill();
  ctx.fillStyle = '#64748b';
  ctx.font = '14px DM Mono, monospace';
  ctx.fillText('https://childhood-friendship.agency/' + category.toLowerCase().replace(/\s+/g, '-'), 155, 35);

  ctx.fillStyle = hexColor;
  ctx.font = 'bold 16px DM Mono, monospace';
  ctx.fillText('EXHIBIT // ' + category.toUpperCase(), 70, 130);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 44px DM Sans, sans-serif';
  ctx.fillText(title, 70, 195);

  for (let c = 0; c < 3; c++) {
    const cardX = 70 + c * 295;
    const cardY = 240;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, 275, 330, 12);
    ctx.fill();
    ctx.strokeStyle = c === 0 ? hexColor : 'rgba(71, 85, 105, 0.4)';
    ctx.lineWidth = c === 0 ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = hexColor;
    ctx.fillRect(cardX + 25, cardY + 30, 40, 6);

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cardX + 25, cardY + 55, 180, 12);
    ctx.fillStyle = '#475569';
    ctx.fillRect(cardX + 25, cardY + 80, 220, 8);
    ctx.fillRect(cardX + 25, cardY + 98, 190, 8);
    ctx.fillRect(cardX + 25, cardY + 116, 140, 8);

    ctx.fillStyle = '#090d16';
    ctx.fillRect(cardX + 25, cardY + 150, 225, 130);
    ctx.strokeStyle = hexColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cardX + 35, cardY + 240);
    ctx.lineTo(cardX + 85, cardY + 210);
    ctx.lineTo(cardX + 135, cardY + 225);
    ctx.lineTo(cardX + 185, cardY + 175);
    ctx.lineTo(cardX + 235, cardY + 185);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}

export function createWallFrameTexture(project: ProjectExhibit, index: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 760;
  const ctx = canvas.getContext('2d')!;

  const hexColor = '#' + project.color.toString(16).padStart(6, '0');

  const grad = ctx.createLinearGradient(0, 0, 1280, 760);
  grad.addColorStop(0, '#0a0d14');
  grad.addColorStop(1, '#05070a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 760);

  ctx.strokeStyle = 'rgba(139, 92, 246, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1280; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 760);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(18, 24, 38, 0.85)';
  ctx.fillRect(0, 0, 1280, 75);

  ctx.fillStyle = hexColor;
  ctx.font = 'bold 22px DM Sans, sans-serif';
  ctx.fillText('CF // DIGITAL', 60, 46);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '16px DM Sans, sans-serif';
  ctx.fillText('Case Study', 300, 46);
  ctx.fillText('Architecture', 420, 46);
  ctx.fillText('Performance', 550, 46);

  ctx.fillStyle = hexColor;
  ctx.beginPath();
  ctx.roundRect(1080, 20, 140, 36, 18);
  ctx.fill();
  ctx.fillStyle = '#0a0d14';
  ctx.font = 'bold 13px DM Mono, monospace';
  ctx.fillText('INTERACTIVE', 1105, 43);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px DM Mono, monospace';
  ctx.fillText('0' + (index + 1) + ' — ' + project.category.toUpperCase(), 60, 150);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px DM Sans, sans-serif';
  ctx.fillText(project.title, 60, 220);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '22px DM Sans, sans-serif';
  ctx.fillText(project.description.slice(0, 68) + '...', 60, 270);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.roundRect(60, 320, 380, 50, 10);
  ctx.fill();
  ctx.strokeStyle = hexColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = hexColor;
  ctx.font = 'bold 16px DM Mono, monospace';
  ctx.fillText('⚡ ' + project.metrics, 80, 352);

  ctx.fillStyle = hexColor;
  ctx.beginPath();
  ctx.roundRect(60, 400, 220, 52, 26);
  ctx.fill();
  ctx.fillStyle = '#0a0d14';
  ctx.font = 'bold 16px DM Sans, sans-serif';
  ctx.fillText('Clicca per esplorare ↗', 85, 432);

  const mockX = 540;
  const mockY = 140;
  const mockW = 680;
  const mockH = 550;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.beginPath();
  ctx.roundRect(mockX, mockY, mockW, mockH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 20px DM Sans, sans-serif';
  ctx.fillText('Live Performance & Metrics Overview', mockX + 40, mockY + 50);

  const barHeights = [180, 260, 220, 310, 280, 360, 340, 420];
  barHeights.forEach((h, bi) => {
    const bx = mockX + 40 + bi * 74;
    const by = mockY + mockH - 60 - h * 0.7;
    const bGrad = ctx.createLinearGradient(0, by, 0, mockY + mockH - 60);
    bGrad.addColorStop(0, hexColor);
    bGrad.addColorStop(1, 'rgba(124, 58, 237, 0.2)');
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.roundRect(bx, by, 50, h * 0.7, 6);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}
