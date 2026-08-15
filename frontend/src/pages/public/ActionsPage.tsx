import React from 'react';
import { useMissions } from '../../lib/queries/publicHooks';
import { GraduationCap, Hospital, Leaf, Briefcase, HeartHandshake, Target, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ActionsPage = () => {
  const { data: missions, isLoading } = useMissions();

  const getIcon = (name: string) => {
    switch (name) {
      case 'GraduationCap': return <GraduationCap className="w-5 h-5" />;
      case 'HeartPulse': return <Hospital className="w-5 h-5" />;
      case 'TreePine': return <Leaf className="w-5 h-5" />;
      case 'Briefcase': return <Briefcase className="w-5 h-5" />;
      case 'HandHeart': return <HeartHandshake className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getBgColor = (index: number) => {
    const colors = ['bg-[#87CE18]', 'bg-[#00A4DE]', 'bg-[#EE7900]', 'bg-[#172642]', 'bg-[#87CE18]'];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="py-[110px] px-6 bg-[#F5F2EC] min-h-screen">
        <div className="max-w-[1280px] mx-auto animate-pulse">
           <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-16"></div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {[1,2,3,4,5].map(i => <div key={i} className="h-64 bg-white rounded-2xl"></div>)}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-[110px] px-6 bg-[#F5F2EC] min-h-screen">
      <div className="max-w-[1280px] mx-auto">
        <div className="max-w-[640px] mx-auto text-center mb-16">
          <div className="text-[#EE7900] font-bold tracking-wider uppercase text-[13px] mb-3.5">Nos actions</div>
          <h1 className="text-[clamp(32px,4vw,44px)] font-extrabold mb-6 leading-[1.15]">Cinq piliers d'action à Louga</h1>
          <p className="text-[17px] text-[#172642]/70 leading-[1.6]">Notre mission est d'améliorer les conditions de vie à Louga à travers cinq domaines d'intervention complémentaires.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {missions?.map((mission: any, index: number) => (
            <div key={mission.id} className="bg-white rounded-[20px] overflow-hidden shadow-[0_12px_30px_-14px_rgba(23,38,66,0.15)] group hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-14px_rgba(23,38,66,0.22)] transition-all duration-300">
              <div className="relative aspect-[16/10] bg-gray-100">
                {mission.image ? (
                  <img src={mission.image.url} alt={mission.title?.fr} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200"></div>
                )}
                <div className={`absolute -bottom-6 right-6 w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-lg ${getBgColor(index)}`}>
                  {getIcon(mission.icon)}
                </div>
              </div>
              <div className="p-7 pt-9">
                <h3 className="text-[20px] font-extrabold text-[#172642] mb-3 group-hover:text-[#00A4DE] transition-colors">{mission.title?.fr}</h3>
                <p className="text-[#172642]/70 leading-[1.6] text-[15px] mb-6">{mission.description?.fr}</p>
                {/* 
                <Link to={`/nos-actions/${mission.id}`} className="inline-flex items-center gap-2 text-[14px] font-bold text-[#172642] hover:text-[#00A4DE] transition-colors">
                  En savoir plus <ArrowRight className="w-4 h-4" />
                </Link>
                */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
