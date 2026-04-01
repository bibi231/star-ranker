/**
 * WinCard Component — Shareable win celebration card
 * Generates a beautiful PNG and provides sharing buttons
 */

import React, { useRef } from 'react';
import toast from 'react-hot-toast';

export function WinCard({ stake, item, payout, oracleHandle, onClose }) {
  const canvasRef = useRef(null);

  const generateCardDataUrl = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    canvas.width = 1080;
    canvas.height = 1080;

    // Background
    ctx.fillStyle = '#0D1B2A';
    ctx.fillRect(0, 0, 1080, 1080);

    // Star field
    ctx.fillStyle = 'rgba(201, 168, 76, 0.25)';
    for (let i = 0; i < 60; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * 1080,
        Math.random() * 1080,
        Math.random() * 2 + 0.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Gold border
    ctx.strokeStyle = '#C9A84C';
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 1040, 1040);

    // Inner accent line
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, 1008, 1008);

    // STAR RANKER logo
    ctx.fillStyle = '#C9A84C';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('?  STAR RANKER', 540, 120);

    // Divider line
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 150);
    ctx.lineTo(980, 150);
    ctx.stroke();

    // "I CALLED IT ?"
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 84px Arial';
    ctx.fillText('I CALLED IT  ?', 540, 270);

    // Item name
    ctx.fillStyle = '#C9A84C';
    ctx.font = 'bold 56px Arial';
    const itemName =
      item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name;
    ctx.fillText(itemName, 540, 360);

    // Category
    ctx.fillStyle = '#6B7280';
    ctx.font = '32px Arial';
    ctx.fillText(item.categorySlug + ' Rankings', 540, 410);

    // Prediction detail
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '36px Arial';
    ctx.fillText(
      `Predicted: ${stake.prediction}   ?   Final Rank: #${item.closingRank || item.rank}`,
      540,
      490
    );

    // Payout — hero number
    ctx.fillStyle = '#C9A84C';
    ctx.font = 'bold 128px Arial';
    ctx.fillText(`?${payout.toLocaleString()}`, 540, 650);

    ctx.fillStyle = '#6B7280';
    ctx.font = '36px Arial';
    ctx.fillText('ORACLE EARNINGS', 540, 700);

    // Divider
    ctx.strokeStyle = 'rgba(201, 168, 76, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 740);
    ctx.lineTo(980, 740);
    ctx.stroke();

    // Oracle handle
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px Arial';
    ctx.fillText(`@${oracleHandle || 'Oracle'}`, 540, 820);

    // CTA
    ctx.fillStyle = '#6B7280';
    ctx.font = '28px Arial';
    ctx.fillText('star-ranker-beryl.vercel.app', 540, 900);
    ctx.fillStyle = '#C9A84C';
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Code: STAR-BETA-2026', 540, 940);

    return canvas.toDataURL('image/png');
  };

  const downloadCard = () => {
    const url = generateCardDataUrl();
    const link = document.createElement('a');
    link.download = `star-ranker-oracle-win.png`;
    link.href = url;
    link.click();
    toast.success('Win card downloaded — share it! ??');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `I just called it on Star Ranker and won ?${payout.toLocaleString()}! ??\nThe Oracle Network is real.\nJoin free ? star-ranker-beryl.vercel.app\nCode: STAR-BETA-2026`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(
      `I just won ?${payout.toLocaleString()} on Star Ranker by predicting ${item.name} rankings correctly! ?? Join with code STAR-BETA-2026 ? star-ranker-beryl.vercel.app`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="bg-[#0D1B2A] rounded-3xl border border-[#C9A84C]/40 p-6 max-w-sm w-full">
          <div className="text-center mb-6">
            <p className="text-5xl mb-2">??</p>
            <p className="text-[#C9A84C] font-black text-2xl">YOU CALLED IT!</p>
            <p className="text-white font-bold text-lg mt-1">
              ?{payout.toLocaleString()} won
            </p>
            <p className="text-gray-400 text-sm">
              {item.name} — {item.categorySlug}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={downloadCard}
              className="w-full bg-[#C9A84C] text-[#0D1B2A] font-black py-4 rounded-2xl text-base"
            >
              ?? Download Win Card
            </button>
            <button
              onClick={shareToTwitter}
              className="w-full bg-black text-white font-bold py-4 rounded-2xl border border-white/20 text-base"
            >
              ?? Share on X / Twitter
            </button>
            <button
              onClick={shareToWhatsApp}
              className="w-full bg-[#25D366] text-white font-bold py-4 rounded-2xl text-base"
            >
              ?? Share on WhatsApp
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white/10 text-gray-400 font-medium py-3 rounded-2xl text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
