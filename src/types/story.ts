/**
 * TypeScript definitions for the interactive story system
 */

// Core story data structures
export interface DialogueLine {
  character: string;
  text: string;
}

export interface Choice {
  text: string;
  nextScene: string;
}

export interface Scene {
  dialogue: DialogueLine[];
  choices: Choice[];
}

export interface Story {
  title: string;
  startScene: string;
  scenes: Record<string, Scene>;
}

// Application state types
export interface AppState {
  currentSceneId: string;
  visitedScenes: Set<string>;
  soundEnabled: boolean;
  showMenu: boolean;
  achievements: string[];
  completedNodes: Set<string>;
  showBirthdayMessage: boolean;
}

export interface SavedProgress {
  scene: string;
  visited: string[];
  achievements: string[];
  nodes: string[];
}

// Achievement system types
export interface Achievement {
  id: string;
  condition: boolean;
  title: string;
  description: string;
}

export interface AchievementNotification {
  title: string;
  description: string;
}

// Performance and rendering types
export type DeviceProfile = 'low' | 'medium' | 'high';

export interface PerformanceSettings {
  particleCount: number;
  animationQuality: number;
  preloadLimit: number;
  typewriterSpeed: number;
  enableComplexEffects: boolean;
  maxConcurrentAnimations: number;
}

// Text rendering types
export interface TextRenderOptions {
  baseSpeed?: number;
  fastSpeed?: number;
  punctuationDelay?: number;
  newLineDelay?: number;
  enableBuffering?: boolean;
  maxBufferSize?: number;
  batchSize?: number;
  maxUpdateRate?: number;
}

export interface TextAnimationState {
  lineIndex: number;
  text: string;
  character: string;
  message: string;
  isComplete: boolean;
  progress: number;
}

export interface ProcessedDialogue {
  id: string;
  character: string;
  text: string;
  fullText: string;
  charCount: number;
  estimatedDuration: number;
  characterBreaks?: number[];
  chunks?: string[];
}

// Performance monitoring types
export interface PerformanceMetrics {
  renderTimes: number[];
  frameDrops: number;
  averageFPS: number;
  textRenderTime: number;
  animationTime: number;
  totalElements: number;
  memoryUsage: number;
  isPerformant: boolean;
  memoryPressure: boolean;
  recommendations: OptimizationRecommendation[];
}

export interface OptimizationRecommendation {
  type: 'fps' | 'text-rendering' | 'memory' | 'frame-drops';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestions: string[];
}

export interface PerformanceReport {
  timestamp: string;
  summary: {
    averageFPS: number;
    averageRenderTime: number;
    frameDrops: number;
    memoryUsage: number;
    performanceRating: {
      score: number;
      grade: string;
    };
  };
  details: PerformanceMetrics;
  recommendations: OptimizationRecommendation[];
}

// Animation and visual effects types
export interface SparkElement {
  id: number;
  left: number;
  top: number;
  delay: number;
}

export interface VoidElement {
  type: 'flesh' | 'shadow';
  id: number;
  left: number;
  top: number;
  delay: number;
}

// Component prop types
export interface ComicViewProps {
  scene: Scene;
  onChoice: (nextSceneId: string) => void;
  completedNodes?: Set<string>;
}

export interface CharacterNameProps {
  character: string;
}

export interface MessageTextProps {
  message: string;
  isComplete: boolean;
}

// Event handler types
export type ChoiceHandler = (nextSceneId: string) => void;
export type SceneChangeHandler = (sceneId: string) => void;
export type PerformanceEventHandler = (data: any) => void;

// Web Worker types for heavy computations
export interface WorkerMessage {
  type: string;
  payload: any;
}

export interface WorkerResponse {
  type: string;
  result: any;
  error?: string;
}

// CSS Module types
export interface CSSModuleClasses {
  readonly [key: string]: string;
}

// Animation timing types
export interface AnimationTimer {
  end: () => void;
}

export interface AnimationMeasurement {
  duration: number;
  fps: number;
  isSmooth: boolean;
}

// Error handling types
export interface ApplicationError {
  type: 'scene-not-found' | 'save-failed' | 'load-failed' | 'audio-failed';
  message: string;
  sceneId?: string;
  details?: any;
}

// Audio types
export interface AudioContextRef {
  current: AudioContext | null;
}

export type SoundType = 'choice' | 'achievement' | 'error' | 'transition';

// React ref types
export interface TextRendererRef {
  current: any; // Will be properly typed when TextRenderer is converted
}

export interface PerformanceMonitorRef {
  current: any; // Will be properly typed when PerformanceMonitor is converted
}

// Utility types
export type Timeout = ReturnType<typeof setTimeout>;
export type AnimationFrameId = number;
export type IntervalId = ReturnType<typeof setInterval>;

// Constants
export const DEVICE_PROFILES = ['low', 'medium', 'high'] as const;
export const ACHIEVEMENT_IDS = [
  'first_steps',
  'memory_keeper', 
  'decision_maker',
  'void_walker',
  'enlightened',
  'explorer'
] as const;

export const SOUND_TYPES = ['choice', 'achievement', 'error', 'transition'] as const;