import React from 'react';
import { Card } from '../ui/Card';
import { IconCircle } from '../ui/IconCircle';

interface MissionCardProps {
  title: string;
  description: string;
  imageUrl: string;
  icon: React.ReactNode;
  iconColor?: 'green' | 'blue' | 'orange' | 'navy';
}

export function MissionCard({ title, description, imageUrl, icon, iconColor = 'green' }: MissionCardProps) {
  return (
    <Card hoverable className="flex flex-col h-full group">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute -bottom-6 left-5">
          <IconCircle icon={icon} color={iconColor} size="md" />
        </div>
      </div>
      <div className="p-8 pt-10 flex-1 flex flex-col">
        <h3 className="text-[18.5px] font-extrabold text-navy mb-3">{title}</h3>
        <p className="text-[14.5px] text-navy/70 leading-relaxed flex-1">
          {description}
        </p>
      </div>
    </Card>
  );
}
