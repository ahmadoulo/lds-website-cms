import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { IconCircle } from '../ui/IconCircle';

interface DonationCardProps {
  number: number;
  title: string;
  description: string;
  actionType: 'phone' | 'link' | 'contact';
  actionData: string;
  actionLabel: string;
  iconColor?: 'green' | 'blue' | 'orange';
}

export function DonationCard({ 
  number, 
  title, 
  description, 
  actionType, 
  actionData, 
  actionLabel, 
  iconColor = 'orange' 
}: DonationCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (actionType !== 'phone') return;
    const digits = actionData.replace(/[^\d+]/g, '');
    navigator.clipboard.writeText(digits).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const colors = {
    green: 'bg-green/15 text-[#5c9412]',
    blue: 'bg-blue/15 text-blue',
    orange: 'bg-orange/15 text-orange',
  };

  const btnColors = {
    green: 'bg-green text-white hover:bg-navy',
    blue: 'bg-blue text-white hover:bg-navy',
    orange: 'border-2 border-orange/40 text-orange hover:bg-orange/10',
  };

  return (
    <div className="bg-white rounded-[20px] p-10 flex flex-col items-center text-center shadow-[0_12px_30px_-16px_rgba(23,38,66,0.12)] h-full">
      <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-[20px] font-extrabold mb-5 ${colors[iconColor]}`}>
        {number}
      </div>
      <h3 className="text-[19px] font-extrabold mb-3.5 text-navy">{title}</h3>
      <p className="text-[14.5px] text-navy/70 leading-relaxed mb-6 flex-1">
        {description}
      </p>

      {actionType === 'phone' && (
        <>
          <div className="bg-warm-muted rounded-xl p-3.5 w-full mb-4">
            <div className="text-[12px] text-navy/55 font-semibold mb-1.5">Via Orange Money / Wave</div>
            <div className="text-[17px] font-extrabold text-navy">{actionData}</div>
          </div>
          <button 
            onClick={handleCopy}
            className={`inline-flex items-center gap-2 font-bold text-[13.5px] px-5 py-2.5 rounded-full transition-colors ${btnColors.orange}`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copié !' : actionLabel}
          </button>
        </>
      )}

      {(actionType === 'link' || actionType === 'contact') && (
        <a 
          href={actionData} 
          className={`w-full font-bold text-[14.5px] p-3.5 rounded-xl transition-colors ${actionType === 'link' ? btnColors.blue : btnColors.green}`}
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
