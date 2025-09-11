/**
 * GIF Optimization and Alternative Media Handler
 * Provides optimized alternatives to GIFs for better performance
 */

export interface MediaOptimizationOptions {
  preferWebP?: boolean;
  preferVideo?: boolean;
  enableLazyLoading?: boolean;
  compressionQuality?: number;
  maxFileSize?: number; // in MB
  deviceProfile?: 'low' | 'medium' | 'high';
}

export interface OptimizedMedia {
  src: string;
  type: 'gif' | 'webp' | 'mp4' | 'css-animation';
  size: number;
  dimensions: { width: number; height: number };
  estimatedLoadTime: number;
  shouldPreload: boolean;
}

/**
 * GIF Alternative Generator using CSS animations
 */
export class CSSAnimationGenerator {
  static createGlitchAnimation(options: {
    colors: string[];
    duration: number;
    intensity: 'low' | 'medium' | 'high';
  }): string {
    const { colors, duration, intensity } = options;
    
    const intensitySettings = {
      low: { steps: 4, maxDisplacement: 2 },
      medium: { steps: 8, maxDisplacement: 5 },
      high: { steps: 12, maxDisplacement: 10 }
    };
    
    const settings = intensitySettings[intensity];
    
    return `
      @keyframes glitchAnimation {
        ${Array.from({ length: settings.steps }, (_, i) => {
          const percentage = (i / (settings.steps - 1)) * 100;
          const displacement = Math.random() * settings.maxDisplacement;
          const colorIndex = Math.floor(Math.random() * colors.length);
          
          return `
            ${percentage}% {
              transform: translateX(${displacement}px) skew(${displacement * 0.5}deg);
              filter: hue-rotate(${Math.random() * 60}deg) contrast(${1 + Math.random() * 0.5});
              color: ${colors[colorIndex]};
            }
          `;
        }).join('')}
      }
      
      .glitch-element {
        animation: glitchAnimation ${duration}s steps(${settings.steps}) infinite;
        transform: translateZ(0);
        will-change: transform, filter;
      }
    `;
  }

  static createMatrixRainAnimation(options: {
    columns: number;
    speed: number;
    colors: string[];
  }): string {
    const { columns, speed, colors } = options;
    
    return `
      @keyframes matrixRain {
        0% {
          transform: translateY(-100vh);
          opacity: 0;
        }
        10% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        100% {
          transform: translateY(100vh);
          opacity: 0;
        }
      }
      
      .matrix-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        transform: translateZ(0);
      }
      
      ${Array.from({ length: columns }, (_, i) => `
        .matrix-column-${i} {
          position: absolute;
          left: ${(i / columns) * 100}%;
          width: ${100 / columns}%;
          height: 200vh;
          background: linear-gradient(
            180deg,
            transparent 0%,
            ${colors[i % colors.length]} 50%,
            transparent 100%
          );
          animation: matrixRain ${speed + Math.random() * 2}s linear infinite;
          animation-delay: ${Math.random() * speed}s;
          transform: translateZ(0);
          will-change: transform;
        }
      `).join('')}
    `;
  }

  static createCyberPulseAnimation(options: {
    size: number;
    colors: { primary: string; secondary: string };
    frequency: number;
  }): string {
    const { size, colors, frequency } = options;
    
    return `
      @keyframes cyberPulse {
        0% {
          transform: scale(0.8) translateZ(0);
          box-shadow: 
            0 0 0 0 ${colors.primary}40,
            0 0 0 0 ${colors.secondary}20;
          background: radial-gradient(circle, ${colors.primary}80 0%, transparent 70%);
        }
        50% {
          transform: scale(1.2) translateZ(0);
          box-shadow: 
            0 0 0 ${size * 0.3}px ${colors.primary}20,
            0 0 0 ${size * 0.6}px ${colors.secondary}10;
          background: radial-gradient(circle, ${colors.primary}60 0%, ${colors.secondary}40 50%, transparent 70%);
        }
        100% {
          transform: scale(0.8) translateZ(0);
          box-shadow: 
            0 0 0 0 ${colors.primary}40,
            0 0 0 0 ${colors.secondary}20;
          background: radial-gradient(circle, ${colors.primary}80 0%, transparent 70%);
        }
      }
      
      .cyber-pulse {
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        animation: cyberPulse ${frequency}s ease-in-out infinite;
        transform: translateZ(0);
        will-change: transform, box-shadow, background;
        contain: strict;
      }
    `;
  }
}

/**
 * Media Optimizer for GIF alternatives
 */
export class MediaOptimizer {
  private options: MediaOptimizationOptions;
  private cache: Map<string, OptimizedMedia> = new Map();

  constructor(options: MediaOptimizationOptions = {}) {
    this.options = {
      preferWebP: true,
      preferVideo: true,
      enableLazyLoading: true,
      compressionQuality: 0.8,
      maxFileSize: 5, // 5MB
      deviceProfile: 'medium',
      ...options
    };
  }

  /**
   * Get optimized media for given GIF
   */
  async getOptimizedMedia(gifPath: string): Promise<OptimizedMedia> {
    // Check cache first
    if (this.cache.has(gifPath)) {
      return this.cache.get(gifPath)!;
    }

    const optimized = await this.analyzeAndOptimize(gifPath);
    this.cache.set(gifPath, optimized);
    return optimized;
  }

  private async analyzeAndOptimize(gifPath: string): Promise<OptimizedMedia> {
    // Simulate file analysis (in real implementation, this would analyze the actual file)
    const fileSize = await this.getFileSize(gifPath);
    const dimensions = await this.getFileDimensions(gifPath);
    
    // Determine best alternative based on file characteristics and device profile
    if (fileSize > this.options.maxFileSize! * 1024 * 1024) {
      // File is too large, prefer CSS animation or compressed video
      if (this.isAnimationCandidate(gifPath)) {
        return this.createCSSAnimationAlternative(gifPath, dimensions);
      }
      return this.createVideoAlternative(gifPath, dimensions, fileSize);
    }

    if (this.options.preferWebP && this.supportsWebP()) {
      return this.createWebPAlternative(gifPath, dimensions, fileSize);
    }

    if (this.options.preferVideo && this.options.deviceProfile !== 'low') {
      return this.createVideoAlternative(gifPath, dimensions, fileSize);
    }

    // Return optimized GIF
    return {
      src: gifPath,
      type: 'gif',
      size: fileSize,
      dimensions,
      estimatedLoadTime: this.calculateLoadTime(fileSize),
      shouldPreload: fileSize < 2 * 1024 * 1024 // Preload if less than 2MB
    };
  }

  private async getFileSize(path: string): Promise<number> {
    // Extract filename to estimate size (this would be actual file analysis in real implementation)
    const filename = path.split('/').pop() || '';
    
    // Simulate file sizes based on filenames
    const sizeMap: Record<string, number> = {
      'generated_video.gif': 5 * 1024 * 1024, // 5MB
      'generated_video (2).gif': 2.5 * 1024 * 1024, // 2.5MB
      'grok-video-431581ef-73ad-4e7e-ab52-75a3ce451c73.gif': 3.7 * 1024 * 1024, // 3.7MB
      'grok-video-4bfcceea-56f1-4883-b1fe-6af544eebb7a.gif': 2.3 * 1024 * 1024, // 2.3MB
      'grok-video-4ec6309b-9d5f-41f5-bc85-139ef398f2e0.gif': 3.5 * 1024 * 1024 // 3.5MB
    };

    return sizeMap[filename] || 1 * 1024 * 1024; // Default 1MB
  }

  private async getFileDimensions(path: string): Promise<{ width: number; height: number }> {
    // Default dimensions for the GIF screen in the app
    return { width: 300, height: 450 };
  }

  private isAnimationCandidate(path: string): boolean {
    // Determine if GIF can be replaced with CSS animation
    // Based on filename patterns that suggest simple animations
    const animationPatterns = ['glitch', 'pulse', 'matrix', 'static'];
    return animationPatterns.some(pattern => path.toLowerCase().includes(pattern));
  }

  private createCSSAnimationAlternative(path: string, dimensions: { width: number; height: number }): OptimizedMedia {
    return {
      src: `css-animation-${path.split('/').pop()}`,
      type: 'css-animation',
      size: 0, // CSS animations have no file size
      dimensions,
      estimatedLoadTime: 0, // Instant
      shouldPreload: false
    };
  }

  private createWebPAlternative(path: string, dimensions: { width: number; height: number }, originalSize: number): OptimizedMedia {
    const webpPath = path.replace('.gif', '.webp');
    const estimatedSize = originalSize * 0.6; // WebP typically 40% smaller
    
    return {
      src: webpPath,
      type: 'webp',
      size: estimatedSize,
      dimensions,
      estimatedLoadTime: this.calculateLoadTime(estimatedSize),
      shouldPreload: estimatedSize < 1.5 * 1024 * 1024
    };
  }

  private createVideoAlternative(path: string, dimensions: { width: number; height: number }, originalSize: number): OptimizedMedia {
    const mp4Path = path.replace('.gif', '.mp4');
    const estimatedSize = originalSize * 0.3; // MP4 typically 70% smaller than GIF
    
    return {
      src: mp4Path,
      type: 'mp4',
      size: estimatedSize,
      dimensions,
      estimatedLoadTime: this.calculateLoadTime(estimatedSize),
      shouldPreload: estimatedSize < 1 * 1024 * 1024
    };
  }

  private supportsWebP(): boolean {
    // Check WebP support
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch {
      return false;
    }
  }

  private calculateLoadTime(sizeInBytes: number): number {
    // Estimate load time based on average mobile connection (5 Mbps)
    const connectionSpeedBps = 5 * 1024 * 1024 / 8; // 5 Mbps in bytes per second
    return sizeInBytes / connectionSpeedBps;
  }

  /**
   * Generate preload hints for critical media
   */
  generatePreloadHints(mediaSources: string[]): string[] {
    const hints: string[] = [];
    
    for (const src of mediaSources) {
      const cached = this.cache.get(src);
      if (cached?.shouldPreload) {
        const rel = cached.type === 'mp4' ? 'prefetch' : 'preload';
        const as = cached.type === 'mp4' ? 'video' : 'image';
        hints.push(`<link rel="${rel}" as="${as}" href="${cached.src}">`);
      }
    }
    
    return hints;
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const totalEntries = this.cache.size;
    const totalSize = Array.from(this.cache.values()).reduce((sum, media) => sum + media.size, 0);
    const typeDistribution = Array.from(this.cache.values()).reduce((dist, media) => {
      dist[media.type] = (dist[media.type] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      totalEntries,
      totalSize: totalSize / (1024 * 1024), // Convert to MB
      typeDistribution,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimate of cache memory usage
    return this.cache.size * 200; // ~200 bytes per cache entry
  }
}

/**
 * Video Loop Generator for GIF replacement
 */
export class VideoLoopGenerator {
  static createVideoElement(options: {
    src: string;
    width: number;
    height: number;
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
    preload?: 'none' | 'metadata' | 'auto';
  }): HTMLVideoElement {
    const video = document.createElement('video');
    
    video.src = options.src;
    video.width = options.width;
    video.height = options.height;
    video.autoplay = options.autoplay ?? true;
    video.muted = options.muted ?? true;
    video.loop = options.loop ?? true;
    video.preload = options.preload ?? 'metadata';
    
    // Optimize for performance
    video.style.transform = 'translateZ(0)';
    video.style.willChange = 'transform';
    video.style.objectFit = 'cover';
    
    // Add performance attributes
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    
    return video;
  }

  static createOptimizedVideoCSS(): string {
    return `
      .optimized-video {
        transform: translateZ(0);
        will-change: transform;
        object-fit: cover;
        image-rendering: optimizeSpeed;
        /* Enable hardware acceleration */
        -webkit-transform: translateZ(0);
        -webkit-backface-visibility: hidden;
        -webkit-perspective: 1000;
      }
      
      .optimized-video::-webkit-media-controls {
        display: none !important;
      }
      
      .optimized-video::-webkit-media-controls-panel {
        display: none !important;
      }
    `;
  }
}

/**
 * Sprite Sheet Animation as GIF alternative
 */
export class SpriteSheetAnimator {
  static createSpriteAnimation(options: {
    spriteSheet: string;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    duration: number;
    loop?: boolean;
  }): string {
    const { spriteSheet, frameWidth, frameHeight, frameCount, duration, loop = true } = options;
    
    return `
      @keyframes spriteAnimation {
        ${Array.from({ length: frameCount }, (_, i) => {
          const percentage = (i / (frameCount - 1)) * 100;
          const xPos = (i * frameWidth);
          return `${percentage}% { background-position: -${xPos}px 0; }`;
        }).join('')}
      }
      
      .sprite-animation {
        width: ${frameWidth}px;
        height: ${frameHeight}px;
        background-image: url(${spriteSheet});
        background-repeat: no-repeat;
        background-size: ${frameWidth * frameCount}px ${frameHeight}px;
        animation: spriteAnimation ${duration}s steps(${frameCount}) ${loop ? 'infinite' : '1'};
        transform: translateZ(0);
        will-change: background-position;
        image-rendering: pixelated;
      }
    `;
  }

  static generateSpriteSheet(frames: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      let loadedFrames = 0;
      const images: HTMLImageElement[] = [];
      
      frames.forEach((frameSrc, index) => {
        const img = new Image();
        img.onload = () => {
          images[index] = img;
          loadedFrames++;
          
          if (loadedFrames === frames.length) {
            // All frames loaded, create sprite sheet
            const frameWidth = images[0].width;
            const frameHeight = images[0].height;
            
            canvas.width = frameWidth * frames.length;
            canvas.height = frameHeight;
            
            images.forEach((img, i) => {
              ctx.drawImage(img, i * frameWidth, 0);
            });
            
            resolve(canvas.toDataURL('image/png', 0.9));
          }
        };
        img.onerror = () => reject(new Error(`Failed to load frame: ${frameSrc}`));
        img.src = frameSrc;
      });
    });
  }
}