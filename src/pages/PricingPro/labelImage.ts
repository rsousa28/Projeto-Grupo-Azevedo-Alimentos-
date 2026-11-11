// Gera o PNG da tabela nutricional desenhando um SVG próprio (sem html2canvas, que não entende as cores oklch do Tailwind 4).
import { NUTRIENT_KEYS, NUTRIENT_LABELS, roundNutrient, type NutritionFacts } from '../../lib/pricing/engine';
import type { Nutrients } from '../../lib/pricing/types';

const INDENT: Partial<Record<keyof Nutrients, number>> = { sugarTotal: 1, sugarAdded: 2, fatSat: 1, fatTrans: 1 };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function nutritionLabelSvg(facts: NutritionFacts, unit: string, portionLabel: string, highIn: string[]): { svg: string; width: number; height: number } {
  const font = 'Helvetica, Arial, sans-serif';
  const portion = Math.round(facts.portionGrams);
  const tableW = 380;
  const rowH = 21;
  const cols = [8, 186, 252, 318]; // x de cada coluna
  const colEdges = [176, 242, 308];
  const top = 62;
  const headerH = 22;
  const rowsTop = top + 6 + headerH;
  const tableH = rowsTop + rowH * NUTRIENT_KEYS.length + 24;
  const sealW = highIn.length ? 130 : 0;
  const width = tableW + (sealW ? sealW + 12 : 0) + 16;
  const height = Math.max(tableH, 40 + highIn.length * 34) + 16;

  const parts: string[] = [];
  parts.push(`<rect width="${width}" height="${height}" fill="#fff"/>`);
  parts.push(`<g transform="translate(8 8)" font-family="${font}" fill="#000">`);
  parts.push(`<rect x="1" y="1" width="${tableW - 2}" height="${tableH - 2}" fill="none" stroke="#000" stroke-width="2"/>`);
  parts.push(`<text x="${tableW / 2}" y="24" text-anchor="middle" font-size="16" font-weight="900">INFORMAÇÃO NUTRICIONAL</text>`);
  parts.push(`<text x="${tableW / 2}" y="44" text-anchor="middle" font-size="12">Porção: ${portion} ${unit} (${esc(portionLabel)})</text>`);
  parts.push(`<rect x="6" y="${top - 10}" width="${tableW - 12}" height="5" fill="#000"/>`);
  const headY = top + headerH - 6;
  [`100 ${unit}`, `${portion} ${unit}`, '%VD*'].forEach((h, i) =>
    parts.push(`<text x="${(colEdges[i] + (colEdges[i + 1] || tableW - 6)) / 2}" y="${headY}" text-anchor="middle" font-size="12" font-weight="700">${h}</text>`),
  );
  parts.push(`<line x1="6" y1="${rowsTop - 2}" x2="${tableW - 6}" y2="${rowsTop - 2}" stroke="#000" stroke-width="1.5"/>`);
  colEdges.forEach((x) =>
    parts.push(`<line x1="${x}" y1="${top - 4}" x2="${x}" y2="${rowsTop + rowH * NUTRIENT_KEYS.length - 2}" stroke="#000"/>`),
  );
  NUTRIENT_KEYS.forEach((k, i) => {
    const y = rowsTop + rowH * i + 15;
    const vd = facts.vdPct[k];
    parts.push(`<text x="${cols[0] + (INDENT[k] || 0) * 10}" y="${y}" font-size="12">${esc(NUTRIENT_LABELS[k])}</text>`);
    parts.push(`<text x="${(colEdges[0] + colEdges[1]) / 2}" y="${y}" text-anchor="middle" font-size="12">${roundNutrient(k, facts.per100[k])}</text>`);
    parts.push(`<text x="${(colEdges[1] + colEdges[2]) / 2}" y="${y}" text-anchor="middle" font-size="12">${roundNutrient(k, facts.perPortion[k])}</text>`);
    parts.push(`<text x="${(colEdges[2] + tableW - 6) / 2}" y="${y}" text-anchor="middle" font-size="12">${vd !== undefined ? Math.round(vd * 100) : ''}</text>`);
    if (i < NUTRIENT_KEYS.length - 1) {
      parts.push(`<line x1="6" y1="${rowsTop + rowH * (i + 1) - 2}" x2="${tableW - 6}" y2="${rowsTop + rowH * (i + 1) - 2}" stroke="#000" stroke-width="0.8"/>`);
    }
  });
  const footY = rowsTop + rowH * NUTRIENT_KEYS.length;
  parts.push(`<rect x="6" y="${footY - 2}" width="${tableW - 12}" height="2" fill="#000"/>`);
  parts.push(`<text x="8" y="${footY + 14}" font-size="10">*Percentual de valores diários fornecidos pela porção.</text>`);

  if (highIn.length) {
    const x = tableW + 12;
    const sealH = 30 + highIn.length * 34;
    parts.push(`<rect x="${x + 1}" y="1" width="${sealW - 2}" height="${sealH}" fill="#fff" stroke="#000" stroke-width="2"/>`);
    parts.push(`<circle cx="${x + 22}" cy="16" r="6" fill="none" stroke="#000" stroke-width="2.5"/><line x1="${x + 26}" y1="20" x2="${x + 32}" y2="26" stroke="#000" stroke-width="3"/>`);
    parts.push(`<text x="${x + 40}" y="21" font-size="13" font-weight="900">ALTO EM</text>`);
    highIn.forEach((h, i) => {
      const y = 30 + i * 34;
      parts.push(`<rect x="${x + 6}" y="${y}" width="${sealW - 12}" height="28" fill="#000"/>`);
      const words = h.split(' ');
      if (words.length > 1) {
        parts.push(`<text x="${x + sealW / 2}" y="${y + 12}" text-anchor="middle" font-size="10" font-weight="900" fill="#fff">${words[0]}</text>`);
        parts.push(`<text x="${x + sealW / 2}" y="${y + 24}" text-anchor="middle" font-size="10" font-weight="900" fill="#fff">${words.slice(1).join(' ')}</text>`);
      } else {
        parts.push(`<text x="${x + sealW / 2}" y="${y + 18}" text-anchor="middle" font-size="11" font-weight="900" fill="#fff">${h}</text>`);
      }
    });
  }
  parts.push('</g>');
  return {
    width,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`,
  };
}

export async function downloadSvgAsPng(svg: string, width: number, height: number, fileName: string, scale = 3) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Falha ao montar a imagem'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = fileName;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
