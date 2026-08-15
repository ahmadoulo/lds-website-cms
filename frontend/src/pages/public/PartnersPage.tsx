import React from 'react';
import { usePartners } from '../../lib/queries/publicHooks';
import { Mosque, HeartPulse, Smartphone, Building2 } from 'lucide-react';

export const PartnersPage = () => {
  const { data: partners, isLoading } = usePartners();

  const getPartnerIcon = (name: string) => {
    switch (name) {
      case 'Mosque': return <Mosque className="w-10 h-10" />;
      case 'HeartPulse': return <HeartPulse className="w-10 h-10" />;
      case 'Smartphone': return <Smartphone className="w-10 h-10" />;
      default: return <Building2 className="w-10 h-10" />;
    }
  };

  if (isLoading) {
    return (
      <div className="py-[110px] px-6 bg-white min-h-[60vh]">
        <div className="max-w-[1280px] mx-auto animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-16"></div>
          <div className="flex flex-wrap justify-center gap-12">
            {[1,2,3].map(i => <div key={i} className="w-48 h-24 bg-gray-100 rounded-2xl"></div>)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-[110px] px-6 bg-white min-h-[60vh] flex flex-col justify-center">
      <div className="max-w-[1280px] mx-auto w-full text-center">
        <div className="text-[#87CE18] font-bold tracking-wider uppercase text-[13px] mb-3.5">Nos partenaires</div>
        <h1 className="text-[clamp(28px,3.5vw,40px)] font-extrabold mb-16 text-[#172642]">Ils nous font confiance</h1>
        
        <div className="flex flex-wrap justify-center items-center gap-x-20 gap-y-16">
          {partners?.map((partner: any) => (
            <div key={partner.id} className="flex flex-col items-center gap-4 group grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
              {partner.logo ? (
                <img src={partner.logo.url} alt={partner.name} className="h-16 object-contain" />
              ) : (
                <div className="text-[#172642] group-hover:text-[#00A4DE] transition-colors">
                  {getPartnerIcon(partner.icon || 'Building2')}
                </div>
              )}
              <span className="font-bold text-[#172642] text-[15px] max-w-[160px] text-center">{partner.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
