'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '../../lib/utils';

export interface BrandLogoProps {
  variant?: 'horizontal' | 'icon' | 'square';
  className?: string;
  priority?: boolean;
  alt?: string;
}

export default function BrandLogo({
  variant = 'horizontal',
  className,
  priority = false,
  alt = 'Contawave',
}: BrandLogoProps) {
  if (variant === 'icon') {
    return (
      <div className={cn('relative flex items-center justify-center shrink-0', className)}>
        <Image
          src="/brand/contawave_logo_only.png"
          alt={alt}
          width={40}
          height={40}
          priority={priority}
          className="object-contain w-auto h-full"
        />
      </div>
    );
  }

  if (variant === 'square') {
    return (
      <div className={cn('relative flex items-center justify-center shrink-0', className)}>
        <Image
          src="/brand/contawave_logo_square.png"
          alt={alt}
          width={120}
          height={94}
          priority={priority}
          className="object-contain w-auto h-full dark:brightness-175 dark:contrast-105 transition-[filter]"
        />
      </div>
    );
  }

  return (
    <div className={cn('relative flex items-center shrink-0', className)}>
      <Image
        src="/brand/contawave_logo_horizontal.png"
        alt={alt}
        width={165}
        height={40}
        priority={priority}
        className="object-contain w-auto h-full dark:brightness-175 dark:contrast-105 transition-[filter]"
      />
    </div>
  );
}
