
import React from 'react';
import { ColorValue } from '../types';

interface SwatchProps {
  color: ColorValue;
  size?: 'sm' | 'md';
  className?: string;
}

export const Swatch: React.FC<SwatchProps> = ({ color, size = 'md', className = '' }) => {
  const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  const rgba = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  
  return (
    <div className={`${sizeClass} rounded-sm overflow-hidden checkerboard relative flex-shrink-0 border border-white/10 ${className}`}>
      <div 
        className="absolute inset-0" 
        style={{ backgroundColor: rgba }}
      />
    </div>
  );
};

interface GradientSwatchProps {
  stops: { color: ColorValue; offset: number }[];
  size?: 'sm' | 'md';
  className?: string;
}

export const GradientSwatch: React.FC<GradientSwatchProps> = ({ stops, size = 'md', className = '' }) => {
  const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';
  
  const gradientString = `linear-gradient(to bottom, ${stops
    .map(s => `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${s.color.a}) ${s.offset * 100}%`)
    .join(', ')})`;

  return (
    <div className={`${sizeClass} rounded-sm overflow-hidden checkerboard relative flex-shrink-0 border border-white/10 ${className}`}>
      <div 
        className="absolute inset-0" 
        style={{ background: gradientString }}
      />
    </div>
  );
};
