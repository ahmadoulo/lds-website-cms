import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NewsCardProps {
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  date: string;
  slug: string;
}

export function NewsCard({ title, excerpt, imageUrl, category, date, slug }: NewsCardProps) {
  return (
    <Card hoverable className="flex flex-col h-full group">
      <div className="aspect-[4/3] overflow-hidden">
        <img 
          src={imageUrl} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-7 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Badge color="blue">{category}</Badge>
          <span className="text-[12.5px] text-navy/50 font-medium">{date}</span>
        </div>
        <h3 className="text-[17.5px] font-extrabold text-navy mb-3 leading-snug">
          {title}
        </h3>
        <p className="text-[14.5px] text-navy/70 leading-relaxed mb-5 flex-1">
          {excerpt}
        </p>
        <Link to={`/actualites/${slug}`} className="inline-flex items-center text-[13.5px] font-bold text-orange hover:text-navy transition-colors">
          Lire la suite <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
        </Link>
      </div>
    </Card>
  );
}
