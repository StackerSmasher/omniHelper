import React, { useState, useEffect, useMemo, useRef } from 'react';
import type {
  ComicViewProps,
  CharacterNameProps,
  MessageTextProps,
  DeviceProfile,
  SparkElement,
  VoidElement,
  AnimationFrameId,
  ProcessedDialogue,
  TextAnimationState
} from '@/types/story';
import styles from './ComicView.module.css';
import { TextRenderer, DeviceProfiler } from '../utils/TextRenderer';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

// Memoized character component for performance
const CharacterName = React.memo<CharacterNameProps>(({ character }) => (
  <span className={styles['character']}>{character}:</span>
));

// Memoized message component with optimized rendering
const MessageText = React.memo<MessageTextProps>(({ message, isComplete }) => (
  <span className={styles['message']}>
    {message}
    {!isComplete && <span className={styles['cursor']}>_</span>}
  </span>
));

const ComicView: React.FC<ComicViewProps> = ({ scene, onChoice, completedNodes = new Set() }) => {
  const [renderedDialogue, setRenderedDialogue] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [isTyping, setIsTyping] = useState<boolean>(true);
  const [showChoices, setShowChoices] = useState<boolean>(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [gifPlayed, setGifPlayed] = useState<Record<string, boolean>>({});
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile>('medium');
  
  // Refs for performance optimization
  const textRendererRef = useRef<TextRenderer | null>(null);
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null);
  const animationFrameRef = useRef<AnimationFrameId | null>(null);
  const sceneBufferRef = useRef<Map<string, ProcessedDialogue[]>>(new Map());
  const dialogueContainerRef = useRef<HTMLDivElement>(null);
  const isTypingAnimationRef = useRef<boolean>(false);

  // Initialize performance utilities
  useEffect(() => {
    // Initialize TextRenderer with optimized settings for current device profile
    if (!textRendererRef.current) {
      const optimizedSettings = DeviceProfiler.getOptimizedSettings(deviceProfile);
      textRendererRef.current = new TextRenderer({
        baseSpeed: optimizedSettings.typewriterSpeed,
        fastSpeed: Math.max(10, optimizedSettings.typewriterSpeed * 0.5),
        punctuationDelay: deviceProfile === 'low' ? 50 : 150,
        newLineDelay: deviceProfile === 'low' ? 200 : 500,
        enableBuffering: true,
        maxBufferSize: deviceProfile === 'low' ? 500 : 1000
      });
    }

    // Initialize PerformanceMonitor
    if (!performanceMonitorRef.current) {
      performanceMonitorRef.current = new PerformanceMonitor({
        sampleSize: 60,
        targetFPS: 60,
        warningThreshold: 16.67,
        criticalThreshold: 33.33,
        enableDetailedProfiling: process.env.NODE_ENV === 'development'
      });
      performanceMonitorRef.current.startMonitoring();
    }

    // Auto-detect device profile on first load
    if (deviceProfile === 'medium') {
      const detectedProfile = DeviceProfiler.getDeviceProfile();
      setDeviceProfile(detectedProfile);
    }

    return () => {
      // Cleanup when component unmounts
      textRendererRef.current?.cleanup();
      performanceMonitorRef.current?.cleanup();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Scene change handler with preloading and buffering
  useEffect(() => {
    if (!scene) return;
    
    const handleSceneChange = async () => {
      // Cancel any existing animations
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      isTypingAnimationRef.current = false;

      // Reset state when scene changes
      setRenderedDialogue([]);
      setCurrentLineIndex(0);
      setIsTyping(true);
      setShowChoices(false);
      setSelectedChoice(null);

      // Preload scene data using TextRenderer
      if (textRendererRef.current) {
        const sceneKey = textRendererRef.current.generateSceneKey(scene);
        
        // Check if scene is already buffered
        if (!sceneBufferRef.current.has(sceneKey)) {
          try {
            const processedDialogue = await textRendererRef.current.preloadScene(scene);
            sceneBufferRef.current.set(sceneKey, processedDialogue);
          } catch (error) {
            console.warn('Failed to preload scene:', error);
          }
        }
      }
    };

    handleSceneChange();
    // Don't reset gifPlayed here - let each GIF manage its own state
  }, [scene]);

  // Optimized typewriter animation using requestAnimationFrame
  useEffect(() => {
    if (!scene || currentLineIndex >= scene.dialogue.length || !textRendererRef.current) {
      if (currentLineIndex >= scene.dialogue.length && !showChoices) {
        setTimeout(() => setShowChoices(true), 500);
      }
      return;
    }

    // Prevent multiple animations from running simultaneously
    if (isTypingAnimationRef.current) {
      return;
    }

    const sceneKey = textRendererRef.current.generateSceneKey(scene);
    const processedDialogue = sceneBufferRef.current.get(sceneKey);
    
    if (!processedDialogue) {
      // Fallback to original method if preloading failed
      const currentLine = scene.dialogue[currentLineIndex];
      const text = `${currentLine.character}: ${currentLine.text}`;
      let charIndex = 0;
      
      const typewriterInterval = setInterval(() => {
        if (charIndex <= text.length) {
          setRenderedDialogue(prev => {
            const newText = [...prev];
            newText[currentLineIndex] = text.substring(0, charIndex);
            return newText;
          });
          charIndex++;
        } else {
          clearInterval(typewriterInterval);
          setTimeout(() => {
            setCurrentLineIndex(prev => prev + 1);
          }, 1500);
        }
      }, 30);

      return () => clearInterval(typewriterInterval);
    }

    // Use optimized TextRenderer animation
    isTypingAnimationRef.current = true;
    
    const animationKey = textRendererRef.current.animateText(
      processedDialogue,
      currentLineIndex,
      (state: TextAnimationState) => {
        // Batch DOM updates using requestAnimationFrame
        requestAnimationFrame(() => {
          setRenderedDialogue(prev => {
            const newText = [...prev];
            newText[state.lineIndex] = state.text;
            return newText;
          });
        });
      },
      () => {
        isTypingAnimationRef.current = false;
        // Add delay before moving to next line for readability
        setTimeout(() => {
          setCurrentLineIndex(prev => prev + 1);
        }, 1500);
      }
    );

    return () => {
      if (textRendererRef.current && animationKey) {
        textRendererRef.current.cancelAnimation(animationKey);
      }
      isTypingAnimationRef.current = false;
    };
  }, [scene, currentLineIndex, showChoices]);

  const handleChoice = (choice: { nextScene: string }, index: number): void => {
    setSelectedChoice(index);
    setTimeout(() => {
      onChoice(choice.nextScene);
    }, 500);
  };

  const applyGlitchEffects = (imageData: ImageData, glitchTypes: string[]): void => {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    glitchTypes.forEach(glitchType => {
      switch(glitchType) {
        case 'cyberPulse':
          // Cyberpunk-style color pulse with neon effects
          for (let i = 0; i < pixels.length; i += 12) {
            if (Math.random() > 0.8) {
              const pulse = Math.sin(Date.now() * 0.01 + i * 0.001) * 0.5 + 0.5;
              pixels[i] = Math.min(255, pixels[i] + pulse * 100); // Red pulse
              pixels[i + 2] = Math.min(255, pixels[i + 2] + pulse * 150); // Blue pulse
              if (pulse > 0.7) pixels[i + 1] = Math.min(255, pixels[i + 1] + 80); // Green flash
            }
          }
          break;
          
        case 'dataCorruption':
          // Digital blocks that look like corrupted data
          for (let y = 0; y < height; y += 25) {
            for (let x = 0; x < width; x += 35) {
              if (Math.random() > 0.7) {
                const blockW = 15 + Math.random() * 10;
                const blockH = 6 + Math.random() * 4;
                const isNeon = Math.random() > 0.5;
                
                for (let by = 0; by < blockH && y + by < height; by += 2) {
                  for (let bx = 0; bx < blockW && x + bx < width; bx += 2) {
                    const idx = ((y + by) * width + (x + bx)) * 4;
                    if (idx < pixels.length) {
                      if (isNeon) {
                        // Neon colors
                        pixels[idx] = Math.random() > 0.5 ? 255 : 0;     // Hot pink/red
                        pixels[idx + 1] = Math.random() * 50;           // Low green
                        pixels[idx + 2] = Math.random() > 0.3 ? 255 : 0; // Cyan/blue
                      } else {
                        // Static noise
                        const gray = Math.random() * 255;
                        pixels[idx] = gray;
                        pixels[idx + 1] = gray;
                        pixels[idx + 2] = gray;
                      }
                    }
                  }
                }
              }
            }
          }
          break;
          
        case 'matrixRain':
          // Matrix-style vertical lines
          for (let x = 0; x < width; x += 8) {
            if (Math.random() > 0.85) {
              const rainHeight = Math.random() * height * 0.3;
              const startY = Math.random() * height;
              
              for (let i = 0; i < rainHeight; i += 3) {
                const y = (startY + i) % height;
                const idx = (Math.floor(y) * width + x) * 4;
                if (idx < pixels.length) {
                  pixels[idx] = 0;       // No red
                  pixels[idx + 1] = 255; // Full green
                  pixels[idx + 2] = Math.random() * 100; // Dim blue
                }
              }
            }
          }
          break;
          
        case 'screenTear':
          // Horizontal screen tear effect
          for (let y = 0; y < height; y += 6) {
            if (Math.random() > 0.8) {
              const tearWidth = Math.random() * 40 + 10;
              const intensity = Math.random() * 0.8 + 0.2;
              
              for (let x = 0; x < width; x++) {
                const sourceX = Math.max(0, Math.min(width - 1, x + tearWidth));
                const sourceIdx = (y * width + sourceX) * 4;
                const targetIdx = (y * width + x) * 4;
                
                if (sourceIdx < pixels.length && targetIdx < pixels.length) {
                  pixels[targetIdx] = pixels[sourceIdx] * intensity;
                  pixels[targetIdx + 1] = pixels[sourceIdx + 1] * intensity;
                  pixels[targetIdx + 2] = pixels[sourceIdx + 2] * intensity;
                }
              }
            }
          }
          break;
          
        case 'ghosting':
          // Ghost/echo effect
          const ghostShift = 3 + Math.random() * 5;
          for (let y = 0; y < height; y += 2) {
            for (let x = ghostShift; x < width; x += 3) {
              const ghostIdx = (y * width + (x - ghostShift)) * 4;
              const currentIdx = (y * width + x) * 4;
              
              if (ghostIdx < pixels.length && currentIdx < pixels.length) {
                pixels[currentIdx] = Math.min(255, pixels[currentIdx] + pixels[ghostIdx] * 0.3);
                pixels[currentIdx + 1] = Math.min(255, pixels[currentIdx + 1] + pixels[ghostIdx + 1] * 0.2);
                pixels[currentIdx + 2] = Math.min(255, pixels[currentIdx + 2] + pixels[ghostIdx + 2] * 0.4);
              }
            }
          }
          break;
          
        case 'pixelDrift':
          // Pixels slowly drifting/melting
          for (let y = 1; y < height - 1; y += 4) {
            for (let x = 1; x < width - 1; x += 4) {
              if (Math.random() > 0.85) {
                const currentIdx = (y * width + x) * 4;
                const driftIdx = ((y + 1) * width + x) * 4;
                
                if (currentIdx < pixels.length && driftIdx < pixels.length) {
                  // Mix current pixel with the one below
                  pixels[driftIdx] = (pixels[currentIdx] + pixels[driftIdx]) * 0.5;
                  pixels[driftIdx + 1] = (pixels[currentIdx + 1] + pixels[driftIdx + 1]) * 0.5;
                  pixels[driftIdx + 2] = (pixels[currentIdx + 2] + pixels[driftIdx + 2]) * 0.5;
                }
              }
            }
          }
          break;
      }
    });
  };

  const handleGifLoad = (imgElement: HTMLImageElement): void => {
    const gifSrc = imgElement.src;
    if (gifPlayed[gifSrc]) return;
    
    // New cyberpunk-themed glitch effects
    const allGlitchTypes = ['cyberPulse', 'dataCorruption', 'matrixRain', 'screenTear', 'ghosting', 'pixelDrift'];
    const numEffects = Math.floor(Math.random() * 2) + 1; // 1-2 effects max
    const selectedGlitches = [];
    
    for (let i = 0; i < numEffects; i++) {
      const randomGlitch = allGlitchTypes[Math.floor(Math.random() * allGlitchTypes.length)];
      if (!selectedGlitches.includes(randomGlitch)) {
        selectedGlitches.push(randomGlitch);
      }
    }
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgElement.naturalWidth || imgElement.width;
    canvas.height = imgElement.naturalHeight || imgElement.height;
    
    let isInFinalPhase = false;
    let isGlitchingComplete = false;
    
    // Start glitching early but lightly during GIF playback
    const earlyGlitchInterval = setInterval(() => {
      if (isInFinalPhase || isGlitchingComplete) {
        clearInterval(earlyGlitchInterval);
        return;
      }
      
      // Light glitches during playback (25% chance)
      if (Math.random() > 0.75) {
        ctx.drawImage(imgElement, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Only light effects during playback
        const lightEffects = ['cyberPulse', 'ghosting'];
        const effectToApply = lightEffects[Math.floor(Math.random() * lightEffects.length)];
        applyGlitchEffects(imageData, [effectToApply]);
        
        ctx.putImageData(imageData, 0, 0);
        imgElement.src = canvas.toDataURL();
      }
    }, 800 + Math.random() * 1200); // Slow, random glitches during playback
    
    // Intensive glitching phase after 3 seconds
    setTimeout(() => {
      if (isGlitchingComplete) return;
      
      isInFinalPhase = true;
      clearInterval(earlyGlitchInterval);
      
      let finalGlitchCount = 0;
      const maxFinalGlitches = Math.floor(Math.random() * 2) + 2; // 2-3 final glitch frames
      
      const finalGlitchInterval = setInterval(() => {
        if (finalGlitchCount >= maxFinalGlitches || isGlitchingComplete) {
          clearInterval(finalGlitchInterval);
          setGifPlayed(prev => ({...prev, [gifSrc]: true}));
          return;
        }
        
        // Intensive final glitches
        ctx.drawImage(imgElement, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use any effect for final phase
        const effectToApply = selectedGlitches[Math.floor(Math.random() * selectedGlitches.length)];
        applyGlitchEffects(imageData, [effectToApply]);
        
        ctx.putImageData(imageData, 0, 0);
        imgElement.src = canvas.toDataURL();
        
        finalGlitchCount++;
      }, 150 + Math.random() * 300); // Faster final glitches
      
    }, 3000); // Start final phase after 3 seconds
    
    // Stop all glitching after 10 seconds total
    setTimeout(() => {
      isGlitchingComplete = true;
      clearInterval(earlyGlitchInterval);
      setGifPlayed(prev => ({...prev, [gifSrc]: true}));
    }, 10000); // Complete stop after 10 seconds
  };

  if (!scene) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>Загрузка...</div>
      </div>
    );
  }

  // Determine scene atmosphere based on current scene
  const getSceneAtmosphere = (): string => {
    if (scene.dialogue[0]?.character === 'Агент Пыли') return styles.agentScene;
    if (scene.dialogue[0]?.character === 'Узел Памяти') return styles.memoryScene;
    if (scene.dialogue[0]?.character === 'Узел Выбора') return styles.choiceScene;
    if (scene.dialogue[0]?.character === 'Узел Забвения') return styles.oblivionScene;
    return '';
  };

  // Get GIF for current scene
  const getSceneGif = (): string | null => {
    // Prologue scene
    if (scene.dialogue[0]?.character === 'Голос из Пустоты') {
      return '/gifs/grok-video-431581ef-73ad-4e7e-ab52-75a3ce451c73.gif';
    }
    
    // Denial scene - specific GIF for "throw away" choice
    if (scene.dialogue[0]?.character === 'Рассказчик' && 
        scene.dialogue[0]?.text === 'Открытка в мусоре. Но отрицать - значит звать тени.') {
      return '/gifs/grok-video-4bfcceea-56f1-4883-b1fe-6af544eebb7a.gif';
    }
    
    // Apartment dark scene - NECHTO on monitor
    if (scene.dialogue[0]?.character === 'Рассказчик' && 
        scene.dialogue[0]?.text.includes('Квартира - гроб тишины. Свет мигает, выхватывая НЕЧТО на мониторе')) {
      return '/gifs/grok-video-4ec6309b-9d5f-41f5-bc85-139ef398f2e0.gif';
    }
    
    // Passion integration and apartment with card scenes
    if (
      (scene.dialogue[0]?.character === 'Сергей' && 
       scene.dialogue[0]?.text === 'Я принимаю огонь. Пусть жжет - в нем я оживаю.') ||
      (scene.dialogue[0]?.character === 'Рассказчик' && 
       scene.dialogue[0]?.text.includes('Экран мерцает. Лицо из пикселей смотрит в душу'))
    ) {
      return '/gifs/generated_video (2).gif';
    }
    
    // Black card and related scenes
    if (
      (scene.dialogue[0]?.character === 'Рассказчик' && 
       scene.dialogue[0]?.text.includes('Черная открытка холодит пальцы')) ||
      (scene.dialogue[0]?.character === 'Рассказчик' && 
       scene.dialogue[0]?.text.includes('Карта - лабиринт выборов')) ||
      (scene.dialogue[0]?.character === 'Рассказчик' && 
       scene.dialogue[0]?.text.includes('Квартира - ловушка воспоминаний. Стены шепчут о бегстве')) ||
      (scene.dialogue[0]?.character === 'Линия Страсти') ||
      (scene.dialogue[0]?.character === 'Линия Разума') ||
      (scene.dialogue[0]?.character === 'Схождение')
    ) {
      return '/gifs/generated_video.gif';
    }
    
    return null;
  };

  // Check if current scene has electrical effects
  const shouldShowElectricalEffects = (): boolean => {
    return scene.dialogue[0]?.character === 'Рассказчик' && 
           scene.dialogue[0]?.text.includes('Щиток гудит, провода дышат');
  };

  // Memoized spark generation - adaptive count based on device profile  
  const generateElectricalSparks = useMemo((): SparkElement[] => {
    const sparkCount = deviceProfile === 'low' ? 4 : deviceProfile === 'medium' ? 6 : 8;
    const sparks: SparkElement[] = [];
    for (let i = 0; i < sparkCount; i++) {
      sparks.push({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 0.2
      });
    }
    return sparks;
  }, [deviceProfile]);

  // Check if current scene has mirror/reflection effects
  const shouldShowMirrorEffects = (): boolean => {
    return scene.dialogue[0]?.character === 'Поток' && 
           scene.dialogue[0]?.text.includes('Тысячи жизней. Ты видишь себя в глазах других');
  };

  // Check if current scene has aggressive void/NECHTO effects
  const shouldShowVoidEffects = (): boolean => {
    return scene.dialogue[0]?.character === 'Рассказчик' && 
           scene.dialogue[0]?.text.includes('НЕЧТО на мониторе - геометрию невозможных углов');
  };

  const shouldShowPostcardEffects = (): boolean => {
    return scene.dialogue[0]?.character === 'Рассказчик' && 
           scene.dialogue[0]?.text.includes('Черная открытка холодит пальцы');
  };

  // Memoized void elements generation - adaptive count based on device profile
  const generateVoidElements = useMemo((): VoidElement[] => {
    const fleshCount = deviceProfile === 'low' ? 6 : deviceProfile === 'medium' ? 9 : 12;
    const shadowCount = deviceProfile === 'low' ? 3 : deviceProfile === 'medium' ? 4 : 6;
    const elements: VoidElement[] = [];
    
    // Digital flesh particles
    for (let i = 0; i < fleshCount; i++) {
      elements.push({
        type: 'flesh',
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 2
      });
    }
    // Void shadows
    for (let i = 0; i < shadowCount; i++) {
      elements.push({
        type: 'shadow',
        id: i + fleshCount,
        left: Math.random() * 80 + 10,
        top: Math.random() * 80 + 10,
        delay: Math.random() * 3
      });
    }
    return elements;
  }, [deviceProfile]);

  // Apply device-specific performance classes
  const getDeviceClass = (): string => {
    if (deviceProfile === 'low') return styles.lowPerformance;
    if (deviceProfile === 'medium') return styles.mediumPerformance;
    if (deviceProfile === 'high') return styles.highPerformance;
    return '';
  };
  
  // Performance monitoring and adaptive optimization
  useEffect(() => {
    if (!performanceMonitorRef.current) return;
    
    const monitor = performanceMonitorRef.current;
    let lastDowngradeTime = 0;
    const DOWNGRADE_COOLDOWN = 5000; // 5 seconds cooldown between downgrades
    
    // Subscribe to performance warnings for adaptive optimization (simplified)
    monitor.onPerformanceEvent('performance-critical', (data) => {
      const now = Date.now();
      // Only downgrade for extreme performance issues with cooldown
      if (data.renderTime > 500 && deviceProfile !== 'low' && (now - lastDowngradeTime > DOWNGRADE_COOLDOWN)) {
        const newProfile = deviceProfile === 'high' ? 'medium' : 'low';
        lastDowngradeTime = now;
        setDeviceProfile(newProfile);
        
        // Update TextRenderer settings for new profile using optimized settings
        if (textRendererRef.current) {
          textRendererRef.current.cleanup();
          const optimizedSettings = DeviceProfiler.getOptimizedSettings(newProfile);
          textRendererRef.current = new TextRenderer({
            baseSpeed: optimizedSettings.typewriterSpeed,
            fastSpeed: Math.max(10, optimizedSettings.typewriterSpeed * 0.5),
            punctuationDelay: newProfile === 'low' ? 50 : 150,
            newLineDelay: newProfile === 'low' ? 200 : 500,
            enableBuffering: true,
            maxBufferSize: newProfile === 'low' ? 500 : 1000
          });
        }
      }
    });

    // Subscribe to frame rate warnings (simplified)
    monitor.onPerformanceEvent('low-fps', (data) => {
      const now = Date.now();
      // Only downgrade for sustained low FPS with cooldown
      if (data.averageFPS < 30 && deviceProfile !== 'low' && (now - lastDowngradeTime > DOWNGRADE_COOLDOWN)) {
        const newProfile = deviceProfile === 'high' ? 'medium' : 'low';
        lastDowngradeTime = now;
        setDeviceProfile(newProfile);
        
        // Update TextRenderer for the new profile
        if (textRendererRef.current) {
          textRendererRef.current.cleanup();
          const optimizedSettings = DeviceProfiler.getOptimizedSettings(newProfile);
          textRendererRef.current = new TextRenderer({
            baseSpeed: optimizedSettings.typewriterSpeed,
            fastSpeed: Math.max(10, optimizedSettings.typewriterSpeed * 0.5),
            punctuationDelay: newProfile === 'low' ? 50 : 150,
            newLineDelay: newProfile === 'low' ? 200 : 500,
            enableBuffering: true,
            maxBufferSize: newProfile === 'low' ? 500 : 1000
          });
        }
      }
    });
    
    // Development-time performance debugging (disabled to prevent performance loops)
    // if (process.env.NODE_ENV === 'development') {
    //   const metricsInterval = setInterval(() => {
    //     const report = monitor.generateReport();
    //     console.groupCollapsed('🎭 Comic Performance Report');
    //     console.log('📊 FPS:', report.summary.averageFPS);
    //     console.log('⏱️ Avg Render Time:', report.summary.averageRenderTime + 'ms');
    //     console.log('🎛️ Device Profile:', deviceProfile);
    //     console.log('💾 Memory Usage:', report.summary.memoryUsage + 'MB');
    //     console.log('📈 Performance Grade:', report.summary.performanceRating.grade);
    //     console.log('🔍 Full Report:', report);
    //     
    //     if (report.recommendations.length > 0) {
    //       console.warn('⚠️ Performance Recommendations:', report.recommendations);
    //     }
    //     console.groupEnd();
    //   }, 10000); // Every 10 seconds
    //   
    //   return () => clearInterval(metricsInterval);
    // }
  }, [deviceProfile]);

  return (
    <div 
      className={`${styles.scene} ${getSceneAtmosphere()} ${getDeviceClass()}`}
      style={{
        transform: 'translateZ(0)', // Hardware acceleration for the entire scene
        willChange: 'transform' // Optimize for scene transitions
      }}
    >
      {/* Atmospheric particles - adaptive count based on device profile */}
      <div className={styles.particles}>
        {[...Array(deviceProfile === 'low' ? 10 : deviceProfile === 'medium' ? 20 : 30)].map((_, i) => (
          <div 
            key={i} 
            className={styles.particle}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 20}s`
            }}
          />
        ))}
      </div>

      {/* Glitch effect overlay */}
      <div className={styles.glitchOverlay} />

      {/* Electrical Effects for specific scene */}
      {shouldShowElectricalEffects() && (
        <div className={styles.electricalOverlay}>
          {/* Circuit lines background */}
          <div className={styles.circuitLines} />
          
          {/* Electric pulse */}
          <div 
            className={styles.electricPulse}
            style={{
              ['--pulse-x' as any]: `${30 + Math.random() * 40}%`,
              ['--pulse-y' as any]: `${30 + Math.random() * 40}%`
            } as React.CSSProperties}
          />
          
          {/* Electric sparks */}
          {generateElectricalSparks.map(spark => (
            <div
              key={spark.id}
              className={styles.electricSparks}
              style={{
                left: `${spark.left}%`,
                top: `${spark.top}%`,
                animationDelay: `${spark.delay}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Mirror/Reflection Effects for specific scene */}
      {shouldShowMirrorEffects() && (
        <div className={styles.mirrorOverlay}>
          {/* Mirror fragments */}
          <div className={styles.mirrorFragment} />
          <div className={styles.mirrorFragment} />
          <div className={styles.mirrorFragment} />
          <div className={styles.mirrorFragment} />
          
          {/* Reflection ripples */}
          <div className={styles.reflectionRipple} />
          <div className={styles.reflectionRipple} />
          <div className={styles.reflectionRipple} />
          
          {/* Identity shatter effect */}
          <div className={styles.identityShatter} />
        </div>
      )}

      {/* Void/NECHTO Effects for aggressive scene */}
      {shouldShowVoidEffects() && (
        <div className={styles.voidOverlay}>
          {/* Impossible geometry shapes */}
          <div className={styles.geometryGlitch} />
          <div className={styles.geometryGlitch} />
          <div className={styles.geometryGlitch} />
          
          {/* Reality tears */}
          {[...Array(6)].map((_, i) => (
            <div
              key={`tear-${i}`}
              className={styles.realityTear}
              style={{
                left: `${15 + i * 12}%`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          ))}
          
          {/* Digital flesh and void shadows */}
          {generateVoidElements.map(element => (
            <div
              key={element.id}
              className={element.type === 'flesh' ? styles.digitalFlesh : styles.voidShadows}
              style={{
                left: `${element.left}%`,
                top: `${element.top}%`,
                animationDelay: `${element.delay}s`
              }}
            />
          ))}
          
          {/* Aggressive screen flicker */}
          <div className={styles.aggressiveFlicker} />
        </div>
      )}

      {/* Black Postcard Effects for metro scene */}
      {shouldShowPostcardEffects() && (
        <div className={styles.postcardOverlay}>
          {/* Metro map veins */}
          <div className={styles.metroVeins} />
          
          {/* Cable arteries */}
          <div className={styles.cableArteries}>
            {[...Array(8)].map((_, i) => (
              <div
                key={`cable-${i}`}
                className={styles.cableArtery}
                style={{
                  left: `${10 + i * 11}%`,
                  animationDelay: `${i * 0.3}s`
                }}
              />
            ))}
          </div>
          
          {/* Cold touch effect */}
          <div className={styles.coldTouch} />
          
          {/* Birthday pulse */}
          <div className={styles.birthdayPulse} />
        </div>
      )}

      {/* GIF Screen - optimized loading */}
      {getSceneGif() && (
        <div 
          className={styles.gifScreen}
          style={{
            transform: 'translateZ(0)', // Hardware acceleration
            willChange: 'transform'
          }}
        >
          <img 
            src={getSceneGif()}
            alt="Cyberpunk scene"
            className={styles.gifImage}
            onLoad={(e) => handleGifLoad(e.target as HTMLImageElement)}
            key={getSceneGif()} // Force reload on scene change
            loading="lazy" // Lazy loading for performance
            decoding="async" // Async decoding
          />
        </div>
      )}

      {/* Dialogue container */}
      <div className={styles.dialogueContainer} ref={dialogueContainerRef}>
        <div 
          className={styles.dialogueBox}
          style={{
            transform: 'translateZ(0)', // Hardware acceleration
            willChange: isTyping ? 'contents' : 'auto', // Optimize for content changes
            contain: 'layout style paint' // Performance containment
          }}
        >
          {scene.dialogue.map((line, index) => {
            // Text virtualization: Only render visible and nearby lines
            const isVisible = index <= currentLineIndex;
            const isNearby = index <= currentLineIndex + 2; // Preload 2 lines ahead
            
            if (!isNearby) return null;
            
            const lineElement = (
              <div 
                key={`line-${index}`} 
                className={`${styles.dialogueLine} ${isVisible ? styles.fadeIn : ''}`}
                style={{ 
                  animationDelay: `${index * 0.2}s`,
                  transform: 'translateZ(0)', // Force hardware acceleration
                  willChange: index === currentLineIndex ? 'contents' : 'auto', // Only optimize current line
                  opacity: isVisible ? 1 : 0,
                  visibility: isVisible ? 'visible' : 'hidden',
                  contain: 'layout style' // Performance containment
                }}
              >
                <CharacterName character={line.character} />
                <MessageText 
                  message={renderedDialogue[index] || ''} 
                  isComplete={index < currentLineIndex}
                />
              </div>
            );
            
            return lineElement;
          })}
        </div>

        {/* Choices */}
        {showChoices && (
          <div 
            className={`${styles.choices} ${styles.fadeIn}`}
          >
            {scene.choices
              .filter((choice) => {
                // For node_decision_hub, filter out completed nodes
                if (scene.dialogue[0]?.character === 'Агент Пыли' && 
                    scene.dialogue[0]?.text.includes('узел пройден')) {
                  const nodeMap = {
                    'Память': 'node_memory',
                    'Выбор': 'node_choice',
                    'Забвение': 'node_oblivion'
                  };
                  const nodeId = nodeMap[choice.text];
                  return !nodeId || !completedNodes.has(nodeId);
                }
                return true;
              })
              .map((choice, index) => (
              <button
                key={index}
                className={`
                  ${styles.choiceButton} 
                  ${selectedChoice === index ? styles.selected : ''}
                  ${selectedChoice !== null && selectedChoice !== index ? styles.notSelected : ''}
                `}
                onClick={() => handleChoice(choice, index)}
                disabled={selectedChoice !== null}
              >
                <span className={styles.choiceGlyph}>
                  {choice.text.startsWith('▲') || choice.text.startsWith('◆') || choice.text.startsWith('●') || choice.text.startsWith('◉') || choice.text.startsWith('↺') || choice.text.startsWith('→') 
                    ? choice.text.substring(0, 1) 
                    : '▸'}
                </span>
                <span className={styles.choiceText}>
                  {choice.text.startsWith('▲') || choice.text.startsWith('◆') || choice.text.startsWith('●') || choice.text.startsWith('◉') || choice.text.startsWith('↺') || choice.text.startsWith('→')
                    ? choice.text.substring(1).trim()
                    : choice.text}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scene indicator */}
      <div className={styles.sceneIndicator}>
        <div className={styles.indicatorDot} />
        <div className={styles.indicatorDot} />
        <div className={styles.indicatorDot} />
      </div>

      {/* Development performance indicator */}
      {process.env.NODE_ENV === 'development' && performanceMonitorRef.current && (
        <div className={styles.performanceIndicator}>
          <div>FPS: {Math.round(performanceMonitorRef.current.getMetrics().averageFPS)}</div>
          <div>Profile: {deviceProfile}</div>
          <div>Memory: {Math.round(performanceMonitorRef.current.getMetrics().memoryUsage)}MB</div>
          <div>Grade: {performanceMonitorRef.current.getMetrics().recommendations.length === 0 ? 'A' : 'B'}</div>
        </div>
      )}
    </div>
  );
};

// Export component with display name for debugging
ComicView.displayName = 'OptimizedComicView';

export default React.memo(ComicView, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  return (
    prevProps.scene?.dialogue === nextProps.scene?.dialogue &&
    prevProps.completedNodes.size === nextProps.completedNodes.size &&
    prevProps.onChoice === nextProps.onChoice
  );
});