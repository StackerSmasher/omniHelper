import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import type { Scene, ProcessedDialogue, TextAnimationState, DeviceProfile } from '@/types/story';
import { OptimizedTextRenderer, TextRendererFactory } from '../utils/OptimizedTextRenderer';
import { TextVirtualizer, SmartTextCache } from '../utils/TextVirtualizer';

interface UseOptimizedTextRendererOptions {
  deviceProfile?: DeviceProfile;
  enableVirtualization?: boolean;
  cacheSize?: number;
  onPerformanceMetrics?: (metrics: any) => void;
}

interface OptimizedTextRendererState {
  renderedDialogue: string[];
  currentLineIndex: number;
  isTyping: boolean;
  showChoices: boolean;
  performanceMetrics: any;
}

/**
 * High-performance text rendering hook for visual novels
 */
export function useOptimizedTextRenderer(
  scene: Scene | null,
  options: UseOptimizedTextRendererOptions = {}
) {
  const {
    deviceProfile = 'medium',
    enableVirtualization = true,
    cacheSize = 50,
    onPerformanceMetrics
  } = options;

  // Core refs
  const rendererRef = useRef<OptimizedTextRenderer | null>(null);
  const virtualizerRef = useRef<TextVirtualizer | null>(null);
  const cacheRef = useRef<SmartTextCache | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // State management
  const [state, setState] = useState<OptimizedTextRendererState>({
    renderedDialogue: [],
    currentLineIndex: 0,
    isTyping: false,
    showChoices: false,
    performanceMetrics: {}
  });

  // Animation tracking
  const animationRef = useRef<string | null>(null);
  const metricsIntervalRef = useRef<number | null>(null);

  // Initialize renderer based on device profile
  const renderer = useMemo(() => {
    return TextRendererFactory.createForDevice(deviceProfile);
  }, [deviceProfile]);

  // Initialize systems
  useEffect(() => {
    rendererRef.current = renderer;
    
    if (enableVirtualization) {
      virtualizerRef.current = new TextVirtualizer(2);
    }
    
    cacheRef.current = new SmartTextCache();
    
    // Setup performance monitoring
    if (onPerformanceMetrics) {
      metricsIntervalRef.current = window.setInterval(() => {
        const metrics = {
          renderer: rendererRef.current?.getPerformanceMetrics(),
          cache: cacheRef.current?.getStats(),
          virtualizer: virtualizerRef.current ? { enabled: true } : { enabled: false }
        };
        onPerformanceMetrics(metrics);
        setState(prev => ({ ...prev, performanceMetrics: metrics }));
      }, 2000);
    }

    return () => {
      rendererRef.current?.cleanup();
      virtualizerRef.current?.cleanup();
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [renderer, enableVirtualization, onPerformanceMetrics]);

  // Initialize virtualizer with container
  useEffect(() => {
    if (containerRef.current && virtualizerRef.current) {
      virtualizerRef.current.init(containerRef.current);
    }
  }, []);

  // Optimized scene loading
  const loadScene = useCallback(async (newScene: Scene) => {
    if (!newScene || !rendererRef.current) return;

    // Reset state
    setState(prev => ({
      ...prev,
      renderedDialogue: [],
      currentLineIndex: 0,
      isTyping: false,
      showChoices: false
    }));

    // Cancel any active animations
    if (animationRef.current) {
      rendererRef.current.cancelAnimation(animationRef.current);
      animationRef.current = null;
    }

    // Check cache first
    const sceneKey = rendererRef.current.generateSceneKey(newScene);
    let processedDialogue = cacheRef.current?.get(sceneKey)?.processed;

    if (!processedDialogue) {
      // Process and cache scene
      processedDialogue = await rendererRef.current.preloadScene(newScene);
      if (cacheRef.current && processedDialogue) {
        cacheRef.current.store(sceneKey, processedDialogue, []);
      }
    }

    // Start text animation
    if (processedDialogue && processedDialogue.length > 0) {
      startTextAnimation(processedDialogue);
    }
  }, []);

  // Optimized text animation
  const startTextAnimation = useCallback((dialogue: ProcessedDialogue[]) => {
    if (!rendererRef.current) return;

    setState(prev => ({ ...prev, isTyping: true }));

    const animateNextLine = (lineIndex: number) => {
      if (lineIndex >= dialogue.length) {
        setState(prev => ({ 
          ...prev, 
          isTyping: false, 
          showChoices: true 
        }));
        return;
      }

      // Get virtualized lines if enabled
      const linesToRender = virtualizerRef.current 
        ? virtualizerRef.current.getVirtualizedLines(dialogue, lineIndex)
        : dialogue;

      animationRef.current = rendererRef.current!.animateTextOptimized(
        linesToRender,
        lineIndex,
        // Optimized update callback with batching
        (state: TextAnimationState) => {
          setState(prev => {
            const newDialogue = [...prev.renderedDialogue];
            newDialogue[state.lineIndex] = state.text;
            return {
              ...prev,
              renderedDialogue: newDialogue,
              currentLineIndex: lineIndex
            };
          });
        },
        // Completion callback
        () => {
          setState(prev => ({ 
            ...prev, 
            currentLineIndex: lineIndex + 1 
          }));
          
          // Continue with next line
          setTimeout(() => {
            animateNextLine(lineIndex + 1);
          }, 100);
        }
      );
    };

    animateNextLine(0);
  }, []);

  // Preload upcoming scenes
  const preloadScenes = useCallback(async (scenes: Scene[]) => {
    if (!rendererRef.current || !cacheRef.current) return;

    const sceneKeys = scenes.map(scene => 
      rendererRef.current!.generateSceneKey(scene)
    );

    await cacheRef.current.preload(sceneKeys, async (key) => {
      const scene = scenes.find(s => 
        rendererRef.current!.generateSceneKey(s) === key
      );
      return scene ? rendererRef.current!.preloadScene(scene) : [];
    });
  }, []);

  // Handle scene changes
  useEffect(() => {
    if (scene) {
      loadScene(scene);
    }
  }, [scene, loadScene]);

  // Skip text animation
  const skipAnimation = useCallback(() => {
    if (animationRef.current && rendererRef.current) {
      rendererRef.current.cancelAnimation(animationRef.current);
      animationRef.current = null;
      
      // Show complete text immediately
      if (scene) {
        const completeDialogue = scene.dialogue.map((line, index) => 
          `${line.character}: ${line.text}`
        );
        setState(prev => ({
          ...prev,
          renderedDialogue: completeDialogue,
          currentLineIndex: scene.dialogue.length,
          isTyping: false,
          showChoices: true
        }));
      }
    }
  }, [scene]);

  // Auto-adjust settings based on performance
  const adjustPerformanceSettings = useCallback((metrics: any) => {
    if (!rendererRef.current) return;

    const { renderer: rendererMetrics } = metrics;
    
    if (rendererMetrics?.activeAnimations > 3) {
      // Too many active animations, reduce batch size
      console.log('Reducing animation complexity due to performance');
    }
    
    if (rendererMetrics?.memoryUsage > 10 * 1024 * 1024) { // 10MB
      // High memory usage, clear some cache
      cacheRef.current?.clear();
    }
  }, []);

  // Apply performance adjustments
  useEffect(() => {
    if (state.performanceMetrics) {
      adjustPerformanceSettings(state.performanceMetrics);
    }
  }, [state.performanceMetrics, adjustPerformanceSettings]);

  return {
    // State
    ...state,
    
    // Refs
    containerRef,
    
    // Actions
    loadScene,
    preloadScenes,
    skipAnimation,
    
    // Utilities
    getVirtualizedLines: useCallback((dialogue: ProcessedDialogue[]) => {
      return virtualizerRef.current?.getVirtualizedLines(dialogue, state.currentLineIndex) || dialogue;
    }, [state.currentLineIndex]),
    
    getCacheStats: useCallback(() => {
      return cacheRef.current?.getStats() || {};
    }, []),
    
    // Performance
    performanceMetrics: state.performanceMetrics
  };
}