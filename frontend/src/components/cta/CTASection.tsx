import React from 'react';
import { Button } from '../ui/Button';

interface CTASectionProps {
  quote: string;
  buttonLabel: string;
  buttonLink: string;
  backgroundImageUrl: string;
}

export function CTASection({ quote, buttonLabel, buttonLink, backgroundImageUrl }: CTASectionProps) {
  return (
    <section className="relative py-32 px-6 text-center overflow-hidden">
      <img 
        src={backgroundImageUrl} 
        alt="" 
        className="absolute inset-0 w-full h-full object-cover brightness-[0.45] saturate-[1.05]" 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy/60 to-navy/90" />
      
      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="w-[60px] h-[60px] rounded-full bg-white mx-auto mb-8 flex items-center justify-center">
          {/* Logo placeholder, replace with actual asset */}
          <div className="font-extrabold text-navy text-sm">LDS</div>
        </div>
        <h2 className="font-lora italic text-3xl md:text-4xl text-white font-medium leading-[1.35] mb-9">
          "{quote}"
        </h2>
        <a href={buttonLink}>
          <Button variant="primary" className="hover:bg-green">
            {buttonLabel}
          </Button>
        </a>
      </div>
    </section>
  );
}
