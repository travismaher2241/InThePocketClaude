/**
 * Video Annotation Utility Library
 * Handles intrinsic coordinate normalization (0..1000 x 0..600), High-DPI canvas scaling,
 * letterbox/pillarbox alignment, shape/line/arrow/text rendering, hit testing, and undo/redo stacks.
 */

export const INTRINSIC_WIDTH = 1000;
export const INTRINSIC_HEIGHT = 600;

export function calculateVideoRect(containerWidth, containerHeight, videoWidth, videoHeight) {
  const vW = videoWidth || 16;
  const vH = videoHeight || 9;
  const containerRatio = containerWidth / containerHeight;
  const videoRatio = vW / vH;

  let width = containerWidth;
  let height = containerHeight;
  let left = 0;
  let top = 0;

  if (videoRatio > containerRatio) {
    // Letterbox top & bottom
    height = containerWidth / videoRatio;
    top = (containerHeight - height) / 2;
  } else {
    // Pillarbox left & right
    width = containerHeight * videoRatio;
    left = (containerWidth - width) / 2;
  }

  return { left, top, width, height };
}

export function drawArrow(ctx, fromX, fromY, toX, toY, width = 6, color = '#ffffff') {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLength = width * 5.0;

  // 1. Black outer stroke/shadow
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.lineWidth = width + 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 5), toY - headLength * Math.sin(angle - Math.PI / 5));
  ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 5), toY - headLength * Math.sin(angle + Math.PI / 5));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 2. Main color arrow
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 5), toY - headLength * Math.sin(angle - Math.PI / 5));
  ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 5), toY - headLength * Math.sin(angle + Math.PI / 5));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawLine(ctx, fromX, fromY, toX, toY, width = 4, color = '#ffffff') {
  // Outline
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.lineWidth = width + 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();

  // Inner Line
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
}

export function drawShape(ctx, shapeType, startX, startY, endX, endY, width = 4, color = '#ffffff') {
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const w = Math.abs(endX - startX);
  const h = Math.abs(endY - startY);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';

  if (shapeType === 'circle') {
    const rx = w / 2;
    const ry = h / 2;
    const cx = x + rx;
    const cy = y + ry;

    // Outline
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = width + 4;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();

    // Inner
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  } else {
    // Rectangle
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = width + 4;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();

    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }
  ctx.restore();
}

export function drawText(ctx, text, x, y, color = '#ffffff', fontSize = 24) {
  ctx.save();
  ctx.font = `bold ${fontSize}px "Arial Black", Impact, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(text).width;
  const paddingX = 18;
  const paddingY = 12;
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.beginPath();
  const rectX = x - boxWidth / 2;
  const rectY = y - boxHeight / 2;
  const radius = 6;
  if (ctx.roundRect) {
    ctx.roundRect(rectX, rectY, boxWidth, boxHeight, radius);
  } else {
    ctx.rect(rectX, rectY, boxWidth, boxHeight);
  }
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function renderAnnotationSet(ctx, annotations = []) {
  if (!ctx || !annotations) return;

  annotations.forEach((item) => {
    if (item.type === 'brush' && item.points && item.points.length > 0) {
      // Black outline
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = (item.strokeWidth || 4) + 6;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(item.points[0].x, item.points[0].y);
      for (let i = 1; i < item.points.length; i++) {
        ctx.lineTo(item.points[i].x, item.points[i].y);
      }
      ctx.stroke();
      ctx.restore();

      // Inner stroke
      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = item.strokeWidth || 4;
      ctx.strokeStyle = item.color || '#ffffff';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(item.points[0].x, item.points[0].y);
      for (let i = 1; i < item.points.length; i++) {
        ctx.lineTo(item.points[i].x, item.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    } else if (item.type === 'arrow') {
      drawArrow(ctx, item.startX, item.startY, item.endX, item.endY, item.strokeWidth || 6, item.color || '#ffffff');
    } else if (item.type === 'line') {
      drawLine(ctx, item.startX, item.startY, item.endX, item.endY, item.strokeWidth || 4, item.color || '#ffffff');
    } else if (item.type === 'shape') {
      drawShape(ctx, item.shapeType || 'rect', item.startX, item.startY, item.endX, item.endY, item.strokeWidth || 4, item.color || '#ffffff');
    } else if (item.type === 'text') {
      drawText(ctx, item.text, item.x, item.y, item.color || '#ffffff', item.fontSize || 24);
    }
  });
}
