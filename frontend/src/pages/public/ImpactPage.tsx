import React from 'react';
import { useImpactStats } from '../../lib/queries/publicHooks';
import CountUp from 'react-countup';

export const ImpactPage = () => {
  const { data: stats, isLoading } = useImpactStats();

  if (isLoading) {
    return (
      <div className="py-[120px] px-6 bg-[#172642] min-h-screen flex items-center">
        <div className="max-w-[1280px] mx-auto w-full animate-pulse">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
             {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/5 rounded-2xl"></div>)}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-[120px] px-6 bg-[#172642] min-h-[60vh] flex flex-col justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(135,206,24,0.08),transparent_70%)]"></div>
      
      <div className="max-w-[1280px] mx-auto w-full relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-[clamp(32px,4vw,44px)] font-extrabold mb-4 text-white leading-tight">Notre impact en chiffres</h1>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">Grâce à votre soutien, nous avons pu accomplir de grandes choses sur le terrain.</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats?.map((stat: any) => (
            <div key={stat.id} className="text-center group">
              <div 
                className="text-5xl md:text-[64px] font-extrabold mb-3 tabular-nums transition-transform duration-500 group-hover:scale-110"
                style={{ color: stat.color || '#87CE18' }}
              >
                <CountUp end={stat.value} duration={2.5} enableScrollSpy scrollSpyOnce />
              </div>
              <div className="text-sm md:text-base text-white/80 font-medium tracking-wide uppercase">{stat.label?.fr}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
