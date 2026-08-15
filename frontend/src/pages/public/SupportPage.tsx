import React from 'react';
import { useDonations } from '../../lib/queries/publicHooks';
import { Heart, Copy, ArrowRight, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SupportPage = () => {
  const { data: donations, isLoading } = useDonations();

  if (isLoading) {
    return (
      <div className="py-[110px] px-6 min-h-[60vh]">
        <div className="max-w-[1280px] mx-auto animate-pulse">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-3xl"></div>)}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-[110px] px-6 min-h-[60vh] flex flex-col justify-center">
      <div className="max-w-[1280px] mx-auto w-full">
        <div className="text-center max-w-[640px] mx-auto mb-16">
          <div className="text-[#EE7900] font-bold tracking-wider uppercase text-[13px] mb-3.5">Agir avec nous</div>
          <h1 className="text-[clamp(32px,4vw,44px)] font-extrabold mb-6 leading-[1.15]">Soutenez nos actions</h1>
          <p className="text-[17px] text-[#172642]/70 leading-[1.6]">Chaque contribution, qu'elle soit financière, matérielle ou humaine, nous permet d'étendre notre impact.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {donations?.map((method: any) => {
            const isOrange = method.iconColor === 'orange';
            const isBlue = method.iconColor === 'blue';
            
            const bgClass = isOrange ? 'bg-[#EE7900]' : isBlue ? 'bg-[#00A4DE]' : 'bg-[#87CE18]';
            const textClass = isOrange ? 'text-[#EE7900]' : isBlue ? 'text-[#00A4DE]' : 'text-[#87CE18]';
            const hoverBgClass = isOrange ? 'hover:bg-[#EE7900]/10' : isBlue ? 'hover:bg-[#00A4DE]/10' : 'hover:bg-[#87CE18]/10';

            return (
              <div key={method.id} className="bg-white border border-gray-100 rounded-[28px] p-8 shadow-[0_12px_30px_-14px_rgba(23,38,66,0.08)] hover:-translate-y-2 hover:shadow-[0_24px_50px_-14px_rgba(23,38,66,0.15)] transition-all duration-300 flex flex-col">
                <div className={`w-14 h-14 rounded-2xl ${bgClass} text-white flex items-center justify-center mb-6 shadow-lg`}>
                  <Heart className="w-6 h-6" />
                </div>
                <h3 className="text-[22px] font-extrabold text-[#172642] mb-3">{method.title?.fr}</h3>
                <p className="text-[#172642]/70 leading-[1.6] mb-8 flex-1">{method.description?.fr}</p>
                
                {method.actionType === 'phone' ? (
                  <button 
                    onClick={() => navigator.clipboard.writeText(method.actionData)}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border-2 border-gray-100 ${textClass} ${hoverBgClass} transition-colors`}
                  >
                    <Copy className="w-4 h-4" /> {method.actionLabel?.fr} : {method.actionData}
                  </button>
                ) : method.actionType === 'link' ? (
                  <Link 
                    to={method.actionData}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${bgClass} text-white shadow-lg hover:brightness-110 transition-all`}
                  >
                    {method.actionLabel?.fr} <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <a 
                    href="mailto:contact@lougasolidaire.org"
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 border-2 border-gray-100 ${textClass} ${hoverBgClass} transition-colors`}
                  >
                    <Mail className="w-4 h-4" /> {method.actionLabel?.fr}
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
