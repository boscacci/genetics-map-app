import React from 'react';
import { MapPoint } from './types';
import {
  cleanDisplayValue,
  displayLocation,
  formatInterpreterServices,
  formatLanguages,
} from './providerDisplay';

const UNKNOWN = 'Unknown';

interface ProviderFactsProps {
  specialist: MapPoint;
  variant: 'tooltip' | 'popup';
}

const availableOrFallback = (value: string): string => value || UNKNOWN;

const ProviderFacts: React.FC<ProviderFactsProps> = ({ specialist, variant }) => {
  const locationText = availableOrFallback(displayLocation(specialist.City, specialist.Country));
  const specialtyText = availableOrFallback(cleanDisplayValue(specialist.specialties));
  const languageText = availableOrFallback(formatLanguages(specialist.language_spoken));
  const interpreterServicesText = formatInterpreterServices(specialist.interpreter_services);
  const containerClass = variant === 'tooltip'
    ? 'provider-facts tooltip-facts'
    : 'popup-details provider-facts';

  return (
    <div className={containerClass}>
      <div className={`provider-fact-item ${variant}-location`}>
        <span className="provider-fact-label">📍 Location:</span>
        <span className="provider-fact-value">{locationText}</span>
      </div>
      <div className={`provider-fact-item ${variant}-specialties`}>
        <span className="provider-fact-label">🧬 Specialty:</span>
        <span className="provider-fact-value">{specialtyText}</span>
      </div>
      <div className={`provider-fact-item ${variant}-languages`}>
        <span className="provider-fact-label">🗣️ Languages:</span>
        <span className="provider-fact-value">{languageText}</span>
      </div>
      <div className={`provider-fact-item ${variant}-interpreter-services`}>
        <span className="provider-fact-label">🔄 Interpreter Services:</span>
        <span className="provider-fact-value">{interpreterServicesText}</span>
      </div>
    </div>
  );
};

export default ProviderFacts;
