import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({ value, size = 200, className = '' }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 1,
        color: { dark: '#0F1216', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      }, (err) => {
        if (err) console.error('QR generation error:', err);
      });
    }
    QRCode.toDataURL(value, { width: 600, margin: 1, errorCorrectionLevel: 'M' }).then(setDataUrl).catch(() => {});
  }, [value, size]);

  function downloadPNG() {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `qr-${value.split('/').slice(-1)[0]}.png`;
    link.click();
  }

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="rounded-2xl border-4 border-graphite-900 bg-white p-4 shadow-lg">
        <canvas ref={canvasRef} width={size} height={size} />
      </div>
      <button onClick={downloadPNG} className="btn-secondary text-xs">
        Download PNG
      </button>
    </div>
  );
}
