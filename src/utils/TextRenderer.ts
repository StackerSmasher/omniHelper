import type { 
  TextRenderOptions, 
  TextAnimationState, 
  ProcessedDialogue, 
  Scene,
  AnimationFrameId,
  DeviceProfile,
  PerformanceSettings
} from '@/types/story';

/**
 * High-performance text renderer optimized for visual novel typewriter effects
 * Eliminates stuttering through efficient animation and rendering strategies
 */
export class TextRenderer {
  private options: Required<TextRenderOptions>;
  private textBuffer: Map<string, ProcessedDialogue[]>;
  private activeAnimations: Map<string, AnimationFrameId>;
  private preloadPromises: Map<string, Promise<ProcessedDialogue[]>>;

  constructor(options: TextRenderOptions = {}) {
    this.options = {
      baseSpeed: options.baseSpeed || 30,
      fastSpeed: options.fastSpeed || 10,
      punctuationDelay: options.punctuationDelay || 150,
      newLineDelay: options.newLineDelay || 500,
      enableBuffering: options.enableBuffering !== false,
      maxBufferSize: options.maxBufferSize || 1000,
      batchSize: options.batchSize || 1,
      maxUpdateRate: options.maxUpdateRate || 16.67,
      ...options
    };
    
    this.textBuffer = new Map();
    this.activeAnimations = new Map();
    this.preloadPromises = new Map();
  }

  /**
   * Preloads and processes text for smooth transitions
   */
  async preloadScene(sceneData: Scene): Promise<ProcessedDialogue[]> {
    if (!sceneData?.dialogue) return [];
    
    const sceneKey = this.generateSceneKey(sceneData);
    if (this.textBuffer.has(sceneKey)) {
      return this.textBuffer.get(sceneKey)!;
    }

    const processedDialogue = sceneData.dialogue.map((line, index) => ({
      id: `${sceneKey}-${index}`,
      character: line.character,
      text: line.text,
      fullText: `${line.character}: ${line.text}`,
      charCount: line.text.length,
      estimatedDuration: this.calculateTypingDuration(line.text)
    }));

    this.textBuffer.set(sceneKey, processedDialogue);
    return processedDialogue;
  }

  /**
   * Optimized typewriter animation using requestAnimationFrame
   */
  animateText(
    dialogue: ProcessedDialogue[], 
    lineIndex: number, 
    onUpdate: (state: TextAnimationState) => void, 
    onComplete?: (lineIndex?: number) => void
  ): string {
    const animationKey = `${dialogue[0]?.id}-${lineIndex}`;
    
    // Cancel existing animation for this line
    if (this.activeAnimations.has(animationKey)) {
      this.cancelAnimation(animationKey);
    }

    const line = dialogue[lineIndex];
    if (!line) {
      onComplete?.();
      return animationKey;
    }

    let charIndex = 0;
    let lastFrameTime = performance.now();
    let accumulatedTime = 0;
    let updateCount = 0;
    
    const animate = (currentTime: number): void => {
      updateCount++;
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      accumulatedTime += deltaTime;
      
      // Safety check: prevent infinite loops
      if (updateCount > 10000) {
        this.activeAnimations.delete(animationKey);
        onComplete?.(lineIndex);
        return;
      }
      
      const speed = this.getCharacterSpeed(line.text[charIndex]);
      
      if (accumulatedTime >= speed) {
        charIndex++;
        accumulatedTime = 0;
        
        const currentText = line.fullText.substring(0, line.character.length + 2 + charIndex);
        const isComplete = charIndex >= line.text.length;
        
        onUpdate({
          lineIndex,
          text: currentText,
          character: line.character,
          message: line.text.substring(0, charIndex),
          isComplete,
          progress: charIndex / line.text.length
        });

        if (isComplete) {
          this.activeAnimations.delete(animationKey);
          setTimeout(() => onComplete?.(lineIndex), this.options.newLineDelay);
          return;
        }
      }

      // Continue animation only if we haven't completed and animation is still active
      if (charIndex < line.text.length && this.activeAnimations.has(animationKey)) {
        this.activeAnimations.set(animationKey, requestAnimationFrame(animate));
      } else {
        this.activeAnimations.delete(animationKey);
      }
    };

    this.activeAnimations.set(animationKey, requestAnimationFrame(animate));
    return animationKey;
  }

  /**
   * Batch update multiple lines for smooth scene transitions
   */
  batchUpdateLines(updates: TextAnimationState[], callback: (updates: TextAnimationState[]) => void): void {
    // Use a single RAF callback to update multiple lines
    requestAnimationFrame(() => {
      callback(updates);
    });
  }

  /**
   * Calculate typing duration based on text content
   */
  calculateTypingDuration(text: string): number {
    let duration = 0;
    for (let i = 0; i < text.length; i++) {
      duration += this.getCharacterSpeed(text[i]);
    }
    return duration + this.options.newLineDelay;
  }

  /**
   * Get typing speed for specific characters
   */
  getCharacterSpeed(char: string): number {
    if (!char) return this.options.baseSpeed;
    
    // Slower for punctuation for natural reading rhythm
    if (/[.!?;:]/.test(char)) {
      return this.options.baseSpeed + this.options.punctuationDelay;
    }
    
    // Slightly faster for spaces and common characters
    if (/[\s,-]/.test(char)) {
      return Math.max(this.options.fastSpeed, this.options.baseSpeed * 0.7);
    }
    
    return this.options.baseSpeed;
  }

  /**
   * Cancel all active animations
   */
  cancelAllAnimations(): void {
    for (const [, animationId] of this.activeAnimations) {
      cancelAnimationFrame(animationId);
    }
    this.activeAnimations.clear();
  }

  /**
   * Cancel specific animation
   */
  cancelAnimation(key: string): void {
    if (this.activeAnimations.has(key)) {
      cancelAnimationFrame(this.activeAnimations.get(key)!);
      this.activeAnimations.delete(key);
    }
  }

  /**
   * Generate unique key for scene caching
   */
  generateSceneKey(sceneData: Scene): string {
    return `scene-${JSON.stringify(sceneData.dialogue).substring(0, 50).replace(/[^a-zA-Z0-9]/g, '')}-${sceneData.dialogue.length}`;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cancelAllAnimations();
    this.textBuffer.clear();
    this.preloadPromises.clear();
  }
}

/**
 * Device performance profiler for adaptive rendering
 */
export class DeviceProfiler {
  static getDeviceProfile(): DeviceProfile {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    
    let profile: DeviceProfile = 'low';
    
    // Check hardware acceleration
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
        if (renderer.includes('NVIDIA') || renderer.includes('AMD') || renderer.includes('Intel HD')) {
          profile = 'medium';
        }
        if (renderer.includes('GTX') || renderer.includes('RTX') || renderer.includes('RX')) {
          profile = 'high';
        }
      }
    }

    // Check CPU performance with a simple benchmark
    const start = performance.now();
    let iterations = 0;
    while (performance.now() - start < 10) {
      Math.random() * Math.random();
      iterations++;
    }

    // Adjust profile based on CPU performance
    if (iterations > 100000) {
      profile = profile === 'low' ? 'medium' : 'high';
    }

    // Check available memory (if supported)
    if (navigator.deviceMemory) {
      if (navigator.deviceMemory >= 8) {
        profile = 'high';
      } else if (navigator.deviceMemory >= 4) {
        profile = profile === 'low' ? 'medium' : profile;
      }
    }

    return profile;
  }

  static getOptimizedSettings(profile: DeviceProfile): PerformanceSettings {
    const settings: Record<DeviceProfile, PerformanceSettings> = {
      low: {
        particleCount: 10,
        animationQuality: 0.5,
        preloadLimit: 2,
        typewriterSpeed: 20,
        enableComplexEffects: false,
        maxConcurrentAnimations: 2
      },
      medium: {
        particleCount: 20,
        animationQuality: 0.75,
        preloadLimit: 5,
        typewriterSpeed: 30,
        enableComplexEffects: true,
        maxConcurrentAnimations: 4
      },
      high: {
        particleCount: 30,
        animationQuality: 1.0,
        preloadLimit: 10,
        typewriterSpeed: 30,
        enableComplexEffects: true,
        maxConcurrentAnimations: 8
      }
    };

    return settings[profile] || settings.medium;
  }
}