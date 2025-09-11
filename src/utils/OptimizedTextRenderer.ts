import type { 
  TextRenderOptions, 
  TextAnimationState, 
  ProcessedDialogue, 
  Scene,
  AnimationFrameId,
  DeviceProfile
} from '@/types/story';

/**
 * High-Performance Text Renderer for Visual Novels
 * Optimized for smooth typewriter effects with minimal stuttering
 */
export class OptimizedTextRenderer {
  private options: Required<TextRenderOptions>;
  private textBuffer: Map<string, ProcessedDialogue[]>;
  private activeAnimations: Map<string, AnimationFrameId>;
  private characterQueue: Map<string, string[]>;
  private batchUpdateTimer: number | null = null;
  private pendingUpdates: Map<string, TextAnimationState> = new Map();

  constructor(options: TextRenderOptions = {}) {
    this.options = {
      baseSpeed: options.baseSpeed || 30,
      fastSpeed: options.fastSpeed || 10,
      punctuationDelay: options.punctuationDelay || 150,
      newLineDelay: options.newLineDelay || 500,
      enableBuffering: options.enableBuffering !== false,
      maxBufferSize: options.maxBufferSize || 1000,
      batchSize: 3, // Characters to reveal per frame
      maxUpdateRate: 16.67, // ~60fps
      ...options
    };
    
    this.textBuffer = new Map();
    this.activeAnimations = new Map();
    this.characterQueue = new Map();
  }

  /**
   * Enhanced text preloading with character analysis
   */
  async preloadScene(sceneData: Scene): Promise<ProcessedDialogue[]> {
    if (!sceneData?.dialogue) return [];
    
    const sceneKey = this.generateSceneKey(sceneData);
    if (this.textBuffer.has(sceneKey)) {
      return this.textBuffer.get(sceneKey)!;
    }

    const processedDialogue = sceneData.dialogue.map((line, index) => {
      const characterBreaks = this.analyzeCharacterBreaks(line.text);
      return {
        id: `${sceneKey}-${index}`,
        character: line.character,
        text: line.text,
        fullText: `${line.character}: ${line.text}`,
        charCount: line.text.length,
        estimatedDuration: this.calculateOptimizedDuration(line.text),
        characterBreaks,
        chunks: this.createTextChunks(line.text, 5) // Pre-chunk for batching
      };
    });

    this.textBuffer.set(sceneKey, processedDialogue);
    return processedDialogue;
  }

  /**
   * Batch-optimized typewriter animation
   */
  animateTextOptimized(
    dialogue: ProcessedDialogue[], 
    lineIndex: number, 
    onUpdate: (state: TextAnimationState) => void, 
    onComplete?: (lineIndex?: number) => void
  ): string {
    const animationKey = `${dialogue[0]?.id}-${lineIndex}`;
    
    // Cancel existing animation
    if (this.activeAnimations.has(animationKey)) {
      this.cancelAnimation(animationKey);
    }

    const line = dialogue[lineIndex];
    if (!line) {
      onComplete?.();
      return animationKey;
    }

    // Initialize character queue for batching
    this.characterQueue.set(animationKey, line.chunks || [line.text]);
    
    let chunkIndex = 0;
    let charIndex = 0;
    let lastFrameTime = performance.now();
    let accumulatedTime = 0;
    let currentDisplayText = line.character + ': ';

    const animate = (currentTime: number): void => {
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      accumulatedTime += deltaTime;
      
      const speed = this.getOptimizedSpeed(line.text[charIndex]);
      
      if (accumulatedTime >= speed) {
        // Batch character reveal
        const batchSize = this.calculateBatchSize(deltaTime);
        let charactersRevealed = 0;
        
        while (charactersRevealed < batchSize && charIndex < line.text.length) {
          currentDisplayText += line.text[charIndex];
          charIndex++;
          charactersRevealed++;
        }
        
        accumulatedTime = 0;
        
        // Queue update for batching
        this.queueUpdate(animationKey, {
          lineIndex,
          text: currentDisplayText,
          character: line.character,
          message: line.text.substring(0, charIndex),
          isComplete: charIndex >= line.text.length,
          progress: charIndex / line.text.length
        });

        if (charIndex >= line.text.length) {
          this.activeAnimations.delete(animationKey);
          this.flushPendingUpdates(); // Ensure final update is sent
          setTimeout(() => onComplete?.(lineIndex), this.options.newLineDelay);
          return;
        }
      }

      if (charIndex < line.text.length && this.activeAnimations.has(animationKey)) {
        this.activeAnimations.set(animationKey, requestAnimationFrame(animate));
      }
    };

    // Start batched update system
    this.startBatchUpdates(onUpdate);
    this.activeAnimations.set(animationKey, requestAnimationFrame(animate));
    return animationKey;
  }

  /**
   * Batched DOM update system
   */
  private queueUpdate(animationKey: string, state: TextAnimationState): void {
    this.pendingUpdates.set(animationKey, state);
  }

  private startBatchUpdates(onUpdate: (state: TextAnimationState) => void): void {
    if (this.batchUpdateTimer) return;
    
    this.batchUpdateTimer = window.setInterval(() => {
      if (this.pendingUpdates.size > 0) {
        // Send all pending updates in a single batch
        for (const [key, state] of this.pendingUpdates) {
          onUpdate(state);
        }
        this.pendingUpdates.clear();
      }
    }, this.options.maxUpdateRate);
  }

  private flushPendingUpdates(): void {
    if (this.batchUpdateTimer) {
      clearInterval(this.batchUpdateTimer);
      this.batchUpdateTimer = null;
    }
  }

  /**
   * Dynamic batch size calculation based on performance
   */
  private calculateBatchSize(deltaTime: number): number {
    // Adapt batch size based on frame time
    if (deltaTime > 20) return 1; // Struggling - reveal one character
    if (deltaTime > 16.67) return 2; // Normal - reveal two characters  
    return this.options.batchSize || 3; // Good performance - full batch
  }

  /**
   * Optimized character speed with caching
   */
  private getOptimizedSpeed(char: string): number {
    if (!char) return this.options.baseSpeed;
    
    // Cache common character speeds
    const charCode = char.charCodeAt(0);
    
    // Punctuation
    if (charCode === 46 || charCode === 33 || charCode === 63) { // . ! ?
      return this.options.baseSpeed + this.options.punctuationDelay;
    }
    
    // Spaces and common characters
    if (charCode === 32 || charCode === 44) { // space, comma
      return this.options.fastSpeed;
    }
    
    return this.options.baseSpeed;
  }

  /**
   * Text analysis for optimal chunking
   */
  private analyzeCharacterBreaks(text: string): number[] {
    const breaks: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (/[.!?;:]/.test(char)) {
        breaks.push(i);
      }
    }
    return breaks;
  }

  /**
   * Create optimized text chunks for batching
   */
  private createTextChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Optimized duration calculation
   */
  private calculateOptimizedDuration(text: string): number {
    let duration = 0;
    let consecutiveSpaces = 0;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === ' ') {
        consecutiveSpaces++;
        // Skip extra spaces to prevent long pauses
        if (consecutiveSpaces > 1) continue;
      } else {
        consecutiveSpaces = 0;
      }
      
      duration += this.getOptimizedSpeed(char);
    }
    
    return duration + this.options.newLineDelay;
  }

  /**
   * Memory-efficient cleanup
   */
  cleanup(): void {
    this.cancelAllAnimations();
    this.flushPendingUpdates();
    this.textBuffer.clear();
    this.characterQueue.clear();
    this.pendingUpdates.clear();
  }

  /**
   * Cancel all animations with proper cleanup
   */
  cancelAllAnimations(): void {
    for (const [, animationId] of this.activeAnimations) {
      cancelAnimationFrame(animationId);
    }
    this.activeAnimations.clear();
    this.characterQueue.clear();
  }

  /**
   * Cancel specific animation
   */
  cancelAnimation(key: string): void {
    if (this.activeAnimations.has(key)) {
      cancelAnimationFrame(this.activeAnimations.get(key)!);
      this.activeAnimations.delete(key);
      this.characterQueue.delete(key);
      this.pendingUpdates.delete(key);
    }
  }

  /**
   * Generate scene key for caching
   */
  generateSceneKey(sceneData: Scene): string {
    return `scene-${JSON.stringify(sceneData.dialogue).substring(0, 50).replace(/[^a-zA-Z0-9]/g, '')}-${sceneData.dialogue.length}`;
  }

  /**
   * Performance metrics
   */
  getPerformanceMetrics() {
    return {
      activeAnimations: this.activeAnimations.size,
      bufferedScenes: this.textBuffer.size,
      pendingUpdates: this.pendingUpdates.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [, dialogue] of this.textBuffer) {
      size += dialogue.reduce((acc, line) => acc + line.text.length, 0);
    }
    return size * 2; // Rough estimate in bytes
  }
}

/**
 * Device-specific text renderer factory
 */
export class TextRendererFactory {
  static createForDevice(profile: DeviceProfile): OptimizedTextRenderer {
    const configs = {
      low: {
        baseSpeed: 40,
        fastSpeed: 20,
        batchSize: 1,
        maxUpdateRate: 33.33, // 30fps
        punctuationDelay: 100,
        newLineDelay: 300
      },
      medium: {
        baseSpeed: 25,
        fastSpeed: 12,
        batchSize: 2,
        maxUpdateRate: 20, // 50fps
        punctuationDelay: 150,
        newLineDelay: 400
      },
      high: {
        baseSpeed: 15,
        fastSpeed: 8,
        batchSize: 4,
        maxUpdateRate: 16.67, // 60fps
        punctuationDelay: 200,
        newLineDelay: 500
      }
    };

    return new OptimizedTextRenderer(configs[profile] || configs.medium);
  }
}

/**
 * Text preloader for instant scene transitions
 */
export class TextPreloader {
  private static instance: TextPreloader;
  private preloadCache: Map<string, Promise<ProcessedDialogue[]>> = new Map();
  private renderer: OptimizedTextRenderer;

  constructor(renderer: OptimizedTextRenderer) {
    this.renderer = renderer;
  }

  static getInstance(renderer: OptimizedTextRenderer): TextPreloader {
    if (!TextPreloader.instance) {
      TextPreloader.instance = new TextPreloader(renderer);
    }
    return TextPreloader.instance;
  }

  async preloadScenes(scenes: Scene[]): Promise<void> {
    const promises = scenes.map(scene => {
      const key = this.renderer.generateSceneKey(scene);
      if (!this.preloadCache.has(key)) {
        this.preloadCache.set(key, this.renderer.preloadScene(scene));
      }
      return this.preloadCache.get(key)!;
    });

    await Promise.all(promises);
  }

  getPreloadedScene(scene: Scene): ProcessedDialogue[] | null {
    const key = this.renderer.generateSceneKey(scene);
    const cached = this.preloadCache.get(key);
    return cached ? (cached as any) : null; // If resolved
  }

  clearCache(): void {
    this.preloadCache.clear();
  }
}