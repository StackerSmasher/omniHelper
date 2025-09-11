import type { ProcessedDialogue, TextAnimationState } from '@/types/story';

/**
 * Text Virtualization System for Visual Novels
 * Efficiently renders only visible text lines to improve performance
 */
export class TextVirtualizer {
  private containerElement: HTMLElement | null = null;
  private visibleRange: { start: number; end: number } = { start: 0, end: 0 };
  private itemHeight: number = 50;
  private bufferSize: number = 2;
  private scrollPosition: number = 0;
  private totalItems: number = 0;

  constructor(bufferSize: number = 2) {
    this.bufferSize = bufferSize;
  }

  /**
   * Initialize virtualization with container element
   */
  init(container: HTMLElement): void {
    this.containerElement = container;
    this.calculateVisibleRange();
    this.setupScrollListener();
  }

  /**
   * Calculate which text lines should be rendered
   */
  calculateVisibleRange(): { start: number; end: number } {
    if (!this.containerElement) return { start: 0, end: 0 };

    const containerHeight = this.containerElement.clientHeight;
    const scrollTop = this.containerElement.scrollTop;
    
    const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize);
    const visibleCount = Math.ceil(containerHeight / this.itemHeight);
    const end = Math.min(this.totalItems, start + visibleCount + this.bufferSize * 2);

    this.visibleRange = { start, end };
    return this.visibleRange;
  }

  /**
   * Get virtualized dialogue lines
   */
  getVirtualizedLines(dialogue: ProcessedDialogue[], currentLineIndex: number): ProcessedDialogue[] {
    this.totalItems = dialogue.length;
    
    // Always include current and upcoming lines
    const activeStart = Math.max(0, currentLineIndex - 1);
    const activeEnd = Math.min(dialogue.length, currentLineIndex + 3);
    
    // Combine with visible range
    const start = Math.min(this.visibleRange.start, activeStart);
    const end = Math.max(this.visibleRange.end, activeEnd);
    
    return dialogue.slice(start, end).map((line, index) => ({
      ...line,
      virtualIndex: start + index,
      isVisible: start + index >= this.visibleRange.start && start + index < this.visibleRange.end,
      isActive: start + index >= activeStart && start + index < activeEnd
    }));
  }

  /**
   * Setup scroll event listener with throttling
   */
  private setupScrollListener(): void {
    if (!this.containerElement) return;

    let ticking = false;
    
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.calculateVisibleRange();
          ticking = false;
        });
        ticking = true;
      }
    };

    this.containerElement.addEventListener('scroll', onScroll, { passive: true });
  }

  /**
   * Update item height based on actual measurements
   */
  updateItemHeight(height: number): void {
    this.itemHeight = height;
    this.calculateVisibleRange();
  }

  /**
   * Cleanup event listeners
   */
  cleanup(): void {
    if (this.containerElement) {
      this.containerElement.removeEventListener('scroll', this.calculateVisibleRange);
    }
  }
}

interface TextChunk {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  priority: number;
}

/**
 * Text Chunk Renderer for progressive loading
 */
export class TextChunkRenderer {
  private renderQueue: Map<string, TextChunk[]> = new Map();
  private activeRenders: Set<string> = new Set();

  /**
   * Break text into optimized chunks
   */
  chunkText(text: string, chunkSize: number = 50): TextChunk[] {
    const chunks: TextChunk[] = [];
    let currentChunk = '';
    let chunkStart = 0;
    
    for (let i = 0; i < text.length; i++) {
      currentChunk += text[i];
      
      // Create chunk at natural break points or size limit
      if (currentChunk.length >= chunkSize || /[.!?]\s/.test(text.substring(i, i + 2))) {
        chunks.push({
          id: `chunk-${chunks.length}`,
          text: currentChunk,
          startIndex: chunkStart,
          endIndex: i,
          priority: chunks.length === 0 ? 1 : 0.5
        });
        
        currentChunk = '';
        chunkStart = i + 1;
      }
    }
    
    // Add remaining text
    if (currentChunk) {
      chunks.push({
        id: `chunk-${chunks.length}`,
        text: currentChunk,
        startIndex: chunkStart,
        endIndex: text.length - 1,
        priority: 0.5
      });
    }
    
    return chunks;
  }

  /**
   * Render chunks progressively
   */
  renderChunks(chunks: TextChunk[], onChunkReady: (chunk: TextChunk) => void): void {
    // Sort by priority
    const sortedChunks = chunks.sort((a, b) => b.priority - a.priority);
    
    let currentIndex = 0;
    const renderNext = () => {
      if (currentIndex >= sortedChunks.length) return;
      
      const chunk = sortedChunks[currentIndex];
      currentIndex++;
      
      // Simulate processing time based on chunk size
      const processTime = Math.min(chunk.text.length * 0.1, 5);
      
      setTimeout(() => {
        onChunkReady(chunk);
        renderNext();
      }, processTime);
    };
    
    renderNext();
  }
}

interface CachedText {
  processed: ProcessedDialogue[];
  chunks: any[];
  metadata: {
    characterCount: number;
    estimatedRenderTime: number;
    lastAccessed: number;
  };
}

/**
 * Smart Text Cache for instant scene transitions
 */
export class SmartTextCache {
  private cache: Map<string, CachedText> = new Map();
  private maxCacheSize: number = 50;
  private accessTimes: Map<string, number> = new Map();

  /**
   * Store processed text with metadata
   */
  store(key: string, data: ProcessedDialogue[], chunks: any[]): void {
    // Evict old entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    const characterCount = data.reduce((sum, line) => sum + line.text.length, 0);
    
    this.cache.set(key, {
      processed: data,
      chunks,
      metadata: {
        characterCount,
        estimatedRenderTime: characterCount * 30, // Rough estimate
        lastAccessed: Date.now()
      }
    });
    
    this.accessTimes.set(key, Date.now());
  }

  /**
   * Retrieve cached text data
   */
  get(key: string): CachedText | null {
    const cached = this.cache.get(key);
    if (cached) {
      cached.metadata.lastAccessed = Date.now();
      this.accessTimes.set(key, Date.now());
      return cached;
    }
    return null;
  }

  /**
   * Preload text data for upcoming scenes
   */
  preload(keys: string[], processor: (key: string) => Promise<ProcessedDialogue[]>): Promise<void[]> {
    const promises = keys.map(async (key) => {
      if (!this.cache.has(key)) {
        try {
          const processed = await processor(key);
          this.store(key, processed, []);
        } catch (error) {
          console.warn(`Failed to preload text for ${key}:`, error);
        }
      }
    });
    
    return Promise.all(promises);
  }

  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalCharacters = Array.from(this.cache.values())
      .reduce((sum, cached) => sum + cached.metadata.characterCount, 0);
    
    return {
      entries: this.cache.size,
      totalCharacters,
      estimatedMemoryMB: (totalCharacters * 2) / (1024 * 1024),
      hitRate: this.calculateHitRate()
    };
  }

  private calculateHitRate(): number {
    // Simplified hit rate calculation
    return this.cache.size > 0 ? 0.85 : 0;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
  }
}