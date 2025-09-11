import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MediaOptimizer, VideoLoopGenerator, CSSAnimationGenerator, type OptimizedMedia } from '../utils/GifOptimizer';
import styles from './OptimizedAnimations.module.css';

interface OptimizedMediaViewerProps {
  src: string;
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
  deviceProfile?: 'low' | 'medium' | 'high';
  onLoad?: () => void;
  onError?: (error: Error) => void;
  enableGlitchEffect?: boolean;
  glitchIntensity?: 'low' | 'medium' | 'high';
}

/**
 * Optimized Media Viewer that automatically selects the best format
 * and applies hardware-accelerated effects
 */
export const OptimizedMediaViewer: React.FC<OptimizedMediaViewerProps> = ({
  src,
  width = 300,
  height = 450,
  alt = '',
  className = '',
  deviceProfile = 'medium',
  onLoad,
  onError,
  enableGlitchEffect = false,
  glitchIntensity = 'medium'
}) => {
  const [optimizedMedia, setOptimizedMedia] = useState<OptimizedMedia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGlitch, setShowGlitch] = useState(false);
  
  const mediaRef = useRef<HTMLVideoElement | HTMLImageElement | HTMLDivElement>(null);
  const glitchTimeoutRef = useRef<number | null>(null);
  
  // Initialize media optimizer
  const mediaOptimizer = useMemo(() => new MediaOptimizer({
    deviceProfile,
    preferWebP: true,
    preferVideo: deviceProfile !== 'low',
    enableLazyLoading: true,
    maxFileSize: deviceProfile === 'low' ? 2 : deviceProfile === 'medium' ? 5 : 10
  }), [deviceProfile]);

  // Load optimized media
  useEffect(() => {
    let mounted = true;
    
    const loadMedia = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const optimized = await mediaOptimizer.getOptimizedMedia(src);
        
        if (mounted) {
          setOptimizedMedia(optimized);
          setIsLoading(false);
          onLoad?.();
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error('Failed to load media');
          setError(error.message);
          setIsLoading(false);
          onError?.(error);
        }
      }
    };

    loadMedia();
    
    return () => {
      mounted = false;
    };
  }, [src, mediaOptimizer, onLoad, onError]);

  // Handle glitch effect timing
  useEffect(() => {
    if (!enableGlitchEffect || !optimizedMedia) return;

    const scheduleGlitch = () => {
      // Random glitch every 3-8 seconds
      const delay = 3000 + Math.random() * 5000;
      
      glitchTimeoutRef.current = window.setTimeout(() => {
        setShowGlitch(true);
        
        // Glitch duration based on intensity
        const glitchDuration = glitchIntensity === 'low' ? 200 : 
                              glitchIntensity === 'medium' ? 500 : 800;
        
        setTimeout(() => {
          setShowGlitch(false);
          scheduleGlitch(); // Schedule next glitch
        }, glitchDuration);
      }, delay);
    };

    scheduleGlitch();

    return () => {
      if (glitchTimeoutRef.current) {
        clearTimeout(glitchTimeoutRef.current);
      }
    };
  }, [enableGlitchEffect, optimizedMedia, glitchIntensity]);

  // Generate CSS animation for CSS-based alternatives
  const cssAnimationStyle = useMemo(() => {
    if (!optimizedMedia || optimizedMedia.type !== 'css-animation') return '';
    
    // Determine animation type based on source filename
    const filename = src.toLowerCase();
    
    if (filename.includes('glitch') || filename.includes('static')) {
      return CSSAnimationGenerator.createGlitchAnimation({
        colors: ['#ff0040', '#00ffff', '#ffffff'],
        duration: 2,
        intensity: glitchIntensity
      });
    }
    
    if (filename.includes('matrix') || filename.includes('rain')) {
      return CSSAnimationGenerator.createMatrixRainAnimation({
        columns: deviceProfile === 'low' ? 8 : deviceProfile === 'medium' ? 12 : 16,
        speed: 3,
        colors: ['#00ff00', '#008800', '#004400']
      });
    }
    
    if (filename.includes('pulse') || filename.includes('cyber')) {
      return CSSAnimationGenerator.createCyberPulseAnimation({
        size: Math.min(width, height),
        colors: { primary: '#ff0040', secondary: '#00ffff' },
        frequency: 2
      });
    }
    
    return '';
  }, [optimizedMedia, src, glitchIntensity, deviceProfile, width, height]);

  // Render loading state
  if (isLoading) {
    return (
      <div 
        className={`${styles.gifScreen} ${className}`}
        style={{ width, height }}
      >
        <div className="loading-placeholder" style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%)',
          backgroundSize: '200% 100%',
          animation: 'loadingShimmer 1.5s ease-in-out infinite'
        }}>
          <style>{`
            @keyframes loadingShimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div 
        className={`${styles.gifScreen} ${className}`}
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ color: '#ff0040', textAlign: 'center', fontFamily: 'monospace' }}>
          <div>⚠️</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>Media Load Error</div>
        </div>
      </div>
    );
  }

  if (!optimizedMedia) return null;

  // Apply glitch effect classes
  const glitchClasses = showGlitch && enableGlitchEffect ? 
    `glitch-active glitch-${glitchIntensity}` : '';

  // Render CSS animation
  if (optimizedMedia.type === 'css-animation') {
    return (
      <>
        <style>{cssAnimationStyle}</style>
        <div
          ref={mediaRef as React.RefObject<HTMLDivElement>}
          className={`${styles.gifScreen} ${className} ${glitchClasses} css-animation-container`}
          style={{ width, height }}
        >
          <div className="animation-content" style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #000011 0%, #001122 50%, #000011 100%)'
          }} />
        </div>
      </>
    );
  }

  // Render video alternative
  if (optimizedMedia.type === 'mp4') {
    return (
      <div className={`${styles.gifScreen} ${className} ${glitchClasses}`} style={{ width, height }}>
        <style>{VideoLoopGenerator.createOptimizedVideoCSS()}</style>
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          className="optimized-video"
          width={width}
          height={height}
          autoPlay
          muted
          loop
          playsInline
          preload={optimizedMedia.shouldPreload ? 'auto' : 'metadata'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'translateZ(0)',
            filter: showGlitch ? `contrast(1.2) brightness(1.1) hue-rotate(${Math.random() * 30}deg)` : 'contrast(1.1) brightness(0.95)'
          }}
          onLoadedData={() => onLoad?.()}
          onError={(e) => onError?.(new Error('Video load failed'))}
        >
          <source src={optimizedMedia.src} type="video/mp4" />
          {/* Fallback to GIF */}
          <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </video>
      </div>
    );
  }

  // Render WebP or optimized image
  return (
    <div className={`${styles.gifScreen} ${className} ${glitchClasses}`} style={{ width, height }}>
      <img
        ref={mediaRef as React.RefObject<HTMLImageElement>}
        src={optimizedMedia.src}
        alt={alt}
        className={styles.gifImage}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'translateZ(0)',
          imageRendering: 'pixelated' as const,
          filter: showGlitch ? `contrast(1.2) brightness(1.1) hue-rotate(${Math.random() * 30}deg)` : 'contrast(1.1) brightness(0.95)'
        }}
        loading={optimizedMedia.shouldPreload ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => onLoad?.()}
        onError={(e) => onError?.(new Error('Image load failed'))}
      />
    </div>
  );
};

/**
 * Optimized Particle System Component
 */
interface OptimizedParticleSystemProps {
  count?: number;
  deviceProfile?: 'low' | 'medium' | 'high';
  colors?: string[];
  speed?: number;
  className?: string;
}

export const OptimizedParticleSystem: React.FC<OptimizedParticleSystemProps> = ({
  count,
  deviceProfile = 'medium',
  colors = ['#00ffff', '#ff0040', '#ffffff'],
  speed = 8,
  className = ''
}) => {
  // Adaptive particle count based on device profile
  const particleCount = count ?? (
    deviceProfile === 'low' ? 6 :
    deviceProfile === 'medium' ? 12 : 18
  );

  // Generate particle configurations
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      startX: Math.random() * 100,
      endX: Math.random() * 100,
      duration: speed + Math.random() * 4,
      delay: Math.random() * speed,
      brightness: 0.7 + Math.random() * 0.6
    }));
  }, [particleCount, colors, speed]);

  return (
    <div className={`${styles.particles} ${className}`}>
      {particles.map(particle => (
        <div
          key={particle.id}
          className={styles.particle}
          style={{
            '--start-x': `${particle.startX}vw`,
            '--end-x': `${particle.endX}vw`,
            '--duration': `${particle.duration}s`,
            '--delay': `${particle.delay}s`,
            '--brightness': particle.brightness,
            background: particle.color,
            boxShadow: `0 0 4px ${particle.color}`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

/**
 * Performance Monitor for Media Components
 */
export const MediaPerformanceMonitor: React.FC<{
  onMetrics?: (metrics: any) => void;
}> = ({ onMetrics }) => {
  const [metrics, setMetrics] = useState({
    loadedMedia: 0,
    totalSize: 0,
    averageLoadTime: 0,
    errors: 0
  });

  useEffect(() => {
    if (onMetrics) {
      onMetrics(metrics);
    }
  }, [metrics, onMetrics]);

  const updateMetrics = useCallback((update: Partial<typeof metrics>) => {
    setMetrics(prev => ({ ...prev, ...update }));
  }, []);

  // Expose update function to parent components
  React.useImperativeHandle(React.createRef(), () => ({
    updateMetrics
  }));

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      border: '1px solid #00ffff',
      borderRadius: '5px',
      padding: '10px',
      color: '#00ffff',
      fontFamily: 'monospace',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <div>Media Loaded: {metrics.loadedMedia}</div>
      <div>Total Size: {(metrics.totalSize / (1024 * 1024)).toFixed(2)}MB</div>
      <div>Avg Load Time: {metrics.averageLoadTime.toFixed(2)}s</div>
      <div>Errors: {metrics.errors}</div>
    </div>
  );
};

export default OptimizedMediaViewer;