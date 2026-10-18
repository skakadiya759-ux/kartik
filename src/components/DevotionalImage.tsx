import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';

interface DevotionalImageProps {
  src: string;
  alt: string;
  fallbackTitle?: string;
  className?: string;
  aspectRatio?: '16/9' | '4/3' | '1/1' | 'auto';
}

export const DevotionalImage = ({
  src,
  alt,
  fallbackTitle,
  className = '',
  aspectRatio = '16/9',
}: DevotionalImageProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const aspectStyles: CSSProperties = {
    aspectRatio: aspectRatio === 'auto' ? undefined : aspectRatio,
  };

  return (
    <div
      className={`image-spiritual-wrapper ${className}`}
      style={aspectStyles}
    >
      {isLoading && !hasError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, #FAF7F2 0%, #EBF3EF 50%, #FAF7F2 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            zIndex: 1,
          }}
        />
      )}

      {hasError ? (
        <div className="image-fallback">
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--accent-gold-soft)',
              color: 'var(--accent-saffron-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.05rem', color: 'var(--primary-deep)', marginBottom: '0.25rem' }}>
              {fallbackTitle || alt}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Hare Krishna • Sacred Kartik Vrata
            </p>
          </div>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </div>
  );
};
