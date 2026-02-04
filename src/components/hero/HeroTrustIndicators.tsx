
import React from 'react';
import { Shield, Truck, Award } from 'lucide-react';
import { useTrustIndicators, useBusiness } from '../../hooks/useBusinessConfig';

const HeroTrustIndicators = () => {
  const configIndicators = useTrustIndicators();
  const business = useBusiness();

  // Use config indicators if available, otherwise use generic defaults
  const indicators = configIndicators.length > 0
    ? configIndicators.map((ind, i) => ({
        icon: [Shield, Truck, Award][i % 3],
        text: ind.text,
      }))
    : [
        { icon: Shield, text: 'Quality Guaranteed' },
        { icon: Truck, text: business.emergencyService ? '24/7 Emergency Service' : 'Fast Response' },
        { icon: Award, text: 'Licensed & Insured' },
      ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pt-6 sm:pt-8 border-t border-white/20">
      {indicators.map((indicator, index) => {
        const IconComponent = indicator.icon;
        return (
          <div key={index} className="flex items-center justify-center lg:justify-start gap-2 text-white/90">
            <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
            <span className="font-medium text-sm sm:text-base">{indicator.text}</span>
          </div>
        );
      })}
    </div>
  );
};

export default HeroTrustIndicators;
