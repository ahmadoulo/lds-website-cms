import React from 'react';
import { Mail, Phone } from 'lucide-react';
import { Container } from '../layout/Container';

export function TopBar() {
  return (
    <div className="bg-navy text-white/85 text-[13px]">
      <Container className="py-2.5 flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-[22px] flex-wrap">
          <a href="mailto:lougasolidaire@gmail.com" className="hover:text-white transition-colors flex items-center">
            <Mail className="w-3.5 h-3.5 mr-2 text-green" />
            lougasolidaire@gmail.com
          </a>
          <a href="tel:+221774723364" className="hover:text-white transition-colors flex items-center">
            <Phone className="w-3.5 h-3.5 mr-2 text-green" />
            +221 77 472 33 64
          </a>
        </div>
        <div className="flex gap-2.5">
          <a href="#" aria-label="Facebook" className="w-[26px] h-[26px] rounded-full bg-white/10 flex items-center justify-center hover:bg-blue transition-colors">
            <i className="fa-brands fa-facebook-f text-[12px]"></i>
          </a>
          <a href="#" aria-label="Instagram" className="w-[26px] h-[26px] rounded-full bg-white/10 flex items-center justify-center hover:bg-orange transition-colors">
            <i className="fa-brands fa-instagram text-[12px]"></i>
          </a>
        </div>
      </Container>
    </div>
  );
}
