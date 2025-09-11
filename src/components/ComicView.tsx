import React, { useState, useEffect, useMemo, useRef } from 'react';
import type {
  ComicViewProps,
  CharacterNameProps,
  MessageTextProps,
  DeviceProfile,
  SparkElement,
  VoidElement,
  AnimationFrameId,
  ProcessedDialogue
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

// Memoized completed line component for maximum performance
const CompletedLine = React.memo<{ line: string; index: number }>(({ line, index }) => {
  const [character, ...messageParts] = line.split(': ');
  const message = messageParts.join(': ');
  
  return (
    <div 
      className={`${styles.dialogueLine} ${styles.fadeIn}`}
      style={{ 
        animationDelay: `${index * 0.2}s`,
        transform: 'translateZ(0)',
        contain: 'layout style'
      }}
    >
      <CharacterName character={character} />
      <MessageText message={message} isComplete={true} />
    </div>
  );
});

// Memoized current typing line component
const CurrentTypingLine = React.memo<{ character: string; currentText: string; lineIndex: number }>(({ character, currentText, lineIndex }) => (
  <div 
    className={`${styles.dialogueLine} ${styles.fadeIn}`}
    style={{ 
      animationDelay: `${lineIndex * 0.2}s`,
      transform: 'translateZ(0)',
      willChange: 'contents',
      contain: 'layout style'
    }}
  >
    <CharacterName character={character} />
    <MessageText message={currentText} isComplete={false} />
  </div>
));

const ComicView: React.FC<ComicViewProps> = ({ scene, onChoice, completedNodes = new Set(), currentSceneId }) => {
  // Separate completed lines from current typing text for better performance
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [currentText, setCurrentText] = useState<string>('');
  const [currentCharacter, setCurrentCharacter] = useState<string>('');
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
  const glitchIntervalsRef = useRef<number[]>([]);

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
      // Cleanup all glitch intervals
      glitchIntervalsRef.current.forEach(id => clearInterval(id));
      glitchIntervalsRef.current = [];
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
      setCompletedLines([]);
      setCurrentText('');
      setCurrentCharacter('');
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
    if (!scene || currentLineIndex >= scene.dialogue.length) {
      if (currentLineIndex >= scene.dialogue.length && !showChoices) {
        setTimeout(() => setShowChoices(true), 500);
      }
      return;
    }

    // Prevent multiple animations from running simultaneously
    if (isTypingAnimationRef.current) {
      return;
    }

    isTypingAnimationRef.current = true;
    
    const currentLine = scene.dialogue[currentLineIndex];
    setCurrentCharacter(currentLine.character);
    let charIndex = 0;
    let animationId: number;
    
    const animateText = () => {
      if (charIndex <= currentLine.text.length) {
        // ВАЖНО: НЕ добавляем character здесь, только текст!
        setCurrentText(currentLine.text.substring(0, charIndex));
        charIndex++;
        animationId = requestAnimationFrame(animateText);
      } else {
        isTypingAnimationRef.current = false;
        // Move completed line to completedLines array (with character name for parsing)
        const fullText = `${currentLine.character}: ${currentLine.text}`;
        setCompletedLines(prev => [...prev, fullText]);
        setCurrentText('');
        setCurrentCharacter('');
        setTimeout(() => {
          setCurrentLineIndex(prev => prev + 1);
        }, 1500);
      }
    };
    
    animationId = requestAnimationFrame(animateText);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      isTypingAnimationRef.current = false;
    };
  }, [scene, currentLineIndex, showChoices]);

  const handleChoice = (choice: { nextScene: string }, index: number): void => {
    setSelectedChoice(index);
    setTimeout(() => {
      onChoice(choice.nextScene);
    }, 500);
  };


  const handleGifLoad = (imgElement: HTMLImageElement): void => {
    const gifSrc = imgElement.src;
    if (gifPlayed[gifSrc]) return;
    
    // Simple glitch effect without memory leaks
    setTimeout(() => {
      setGifPlayed(prev => ({...prev, [gifSrc]: true}));
    }, 3000);
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
    if (shouldShowEntropyAnnihilation()) return `${styles.scene} ${styles.entropyScene}`;
    if (scene.dialogue[0]?.character === 'Агент Пыли') return styles.agentScene;
    if (scene.dialogue[0]?.character === 'Узел Памяти') return styles.memoryScene;
    if (scene.dialogue[0]?.character === 'Узел Выбора') return styles.choiceScene;
    if (scene.dialogue[0]?.character === 'Узел Забвения') return styles.oblivionScene;
    if (shouldShowNodeSelectionEffects()) return `${styles.choiceScene} ${styles.nodeSelectionScene}`;
    if (shouldShowMemoryNodeEffects()) return `${styles.memoryScene} ${styles.memoryNodeScene}`;
    return '';
  };

  // Get GIF for current scene
  const getSceneGif = (): string | null => {
    // Prologue scene
    if (scene.dialogue[0]?.character === 'Голос из Пустоты') {
      return '/gifs/grok-video-431581ef-73ad-4e7e-ab52-75a3ce451c73.gif';
    }
    
    // Three truths scene - Три истины, три версии тебя в пустоте
    if (scene.dialogue[0]?.character === 'Агент Пыли' && 
        scene.dialogue[0]?.text === 'Три истины. Три версии тебя в пустоте.') {
      return '/pic/image.png';
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
    
    // New scenes from Russian dialogue
    // Рассказчик: Щиток гудит, провода дышат. Прикосновение - поток чужих жизней, шепот забытых душ.
    if (scene.dialogue[0]?.character === 'Рассказчик' && 
        scene.dialogue[0]?.text === 'Щиток гудит, провода дышат. Прикосновение - поток чужих жизней, шепот забытых душ.') {
      return '/gifs/grok-video-31bf8840-eab3-4db9-b540-2aa8b3733001.gif';
    }
    
    // Поток: Тысячи жизней. Ты видишь себя в глазах других - фрагмент чужой мозаики.
    if (scene.dialogue[0]?.character === 'Поток' && 
        scene.dialogue[0]?.text === 'Тысячи жизней. Ты видишь себя в глазах других - фрагмент чужой мозаики.') {
      return '/gifs/0bcb72d0-3c67-4caa-b5ce-7f97af998d8d.png';
    }
    
    // Агент Пыли: Каждый Узел — это не остановка, а разрыв, где мир сам себя предаёт в пользу нового контура реальности...
    if (scene.dialogue[0]?.character === 'Агент Пыли' && 
        scene.dialogue[0]?.text === 'Каждый Узел — это не остановка, а разрыв, где мир сам себя предаёт в пользу нового контура реальности...') {
      return '/gifs/grok-video-fe46005c-ccc4-4f8d-aa53-66aa518e02f8 (1).gif';
    }
    
    return null;
  };

  // Check if current scene has electrical effects
  const shouldShowElectricalEffects = (): boolean => {
    return (scene.dialogue[0]?.character === 'Рассказчик' && 
            (scene.dialogue[0]?.text.includes('Щиток гудит, провода дышат') || 
             scene.dialogue[0]?.text === 'Щиток гудит, провода дышат. Прикосновение - поток чужих жизней, шепот забытых душ.')) ||
           (scene.dialogue[0]?.character === 'Эхо' && 
            scene.dialogue[0]?.text.includes('Электричество - лишь метафора'));
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
    return (scene.dialogue[0]?.character === 'Поток' && 
            (scene.dialogue[0]?.text.includes('Тысячи жизней. Ты видишь себя в глазах других') ||
             scene.dialogue[0]?.text === 'Тысячи жизней. Ты видишь себя в глазах других - фрагмент чужой мозаики.')) ||
           (scene.dialogue[0]?.character === 'Коллектив' && 
            scene.dialogue[0]?.text.includes('Все мы - отражения. Истинное я теряется в зеркалах'));
  };

  // Check if current scene should trigger the final entropy annihilation
  const shouldShowEntropyAnnihilation = (): boolean => {
    return currentSceneId === 'all_nodes_complete' || 
           currentSceneId === 'new_beginning';
  };

  // Get random chaos image for filling empty space
  const getChaosImages = (): string[] => {
    const availableImages = [
      '/pic/photo_2025-09-11_19-29-58 (2).png',
      '/pic/image.png',
      '/gifs/grok-video-fe46005c-ccc4-4f8d-aa53-66aa518e02f8 (1).gif',
      '/gifs/0bcb72d0-3c67-4caa-b5ce-7f97af998d8d.png',
      '/gifs/grok-video-4ec6309b-9d5f-41f5-bc85-139ef398f2e0.gif',
      '/gifs/grok-video-431581ef-73ad-4e7e-ab52-75a3ce451c73.gif',
      '/gifs/generated_video (2).gif',
      '/gifs/Здесь похоронены упущенные.gif',
      '/gifs/grok-video-4bfcceea-56f1-4883-b1fe-6af544eebb7a.gif',
      '/gifs/generated_video.gif',
      '/gifs/grok-video-31bf8840-eab3-4db9-b540-2aa8b3733001.gif'
    ];
    return availableImages;
  };

  // Check if we should show chaotic image overlay
  const shouldShowChaosOverlay = (): boolean => {
    return !shouldShowNodeSelectionEffects() && 
           !shouldShowMemoryNodeEffects() && 
           !getSceneGif() &&
           !shouldShowEntropyAnnihilation() &&
           Math.random() > 0.3; // Random chaos
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

  // Check if current scene has node selection effects
  const shouldShowNodeSelectionEffects = (): boolean => {
    return (scene.dialogue[0]?.character === 'Узел Выбора' ||
            (scene.dialogue[0]?.character === 'Рассказчик' && 
             (scene.dialogue[0]?.text.includes('УЗЕЛ: ВЫБОР - ИЛЛЮЗИЯ') ||
              scene.dialogue[0]?.text.includes('ПРОШЛОЕ ДИКТУЕТ КАЖДОЕ "ДА"') ||
              scene.dialogue[0]?.text.includes('NODE: DISPROVE'))));
  };

  // Check if current scene has memory node effects
  const shouldShowMemoryNodeEffects = (): boolean => {
    return (scene.dialogue[0]?.character === 'Узел Памяти' ||
            (scene.dialogue[0]?.character === 'Рассказчик' && 
             (scene.dialogue[0]?.text.includes('УЗЕЛ ПАМЯТИ') ||
              scene.dialogue[0]?.text.includes('MEMORY NODE') ||
              scene.dialogue[0]?.text.includes('воспоминания') ||
              scene.dialogue[0]?.text.includes('прошлое'))));
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

      {/* Node Selection Effects for choice nodes */}
      {shouldShowNodeSelectionEffects() && (
        <div className={styles.nodeSelectionOverlay}>
          {/* Choice matrix background */}
          <div className={styles.choiceMatrix} />
          
          {/* Decision chains */}
          <div className={styles.decisionChains}>
            {[...Array(6)].map((_, i) => (
              <div
                key={`chain-${i}`}
                className={styles.decisionChain}
                style={{
                  left: `${15 + i * 12}%`,
                  animationDelay: `${i * 0.2}s`
                }}
              />
            ))}
          </div>
          
          {/* Silhouette effect */}
          <div className={styles.silhouetteEffect} />
          
          {/* Past echoes */}
          <div className={styles.pastEchoes}>
            {[...Array(4)].map((_, i) => (
              <div
                key={`echo-${i}`}
                className={styles.pastEcho}
                style={{
                  top: `${20 + i * 15}%`,
                  animationDelay: `${i * 0.5}s`
                }}
              />
            ))}
          </div>
          
          {/* Determinism waves */}
          <div className={styles.determinismWaves} />
          
          {/* Choice illusion particles */}
          {[...Array(12)].map((_, i) => (
            <div
              key={`illusion-${i}`}
              className={styles.choiceIllusionParticle}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Memory Node Effects */}
      {shouldShowMemoryNodeEffects() && (
        <div className={styles.memoryNodeOverlay}>
          {/* Memory fragments */}
          <div className={styles.memoryFragments}>
            {[...Array(8)].map((_, i) => (
              <div
                key={`fragment-${i}`}
                className={styles.memoryFragment}
                style={{
                  left: `${10 + i * 10}%`,
                  top: `${20 + (i % 3) * 20}%`,
                  animationDelay: `${i * 0.3}s`
                }}
              />
            ))}
          </div>
          
          {/* Temporal distortion */}
          <div className={styles.temporalDistortion} />
          
          {/* Memory waves */}
          <div className={styles.memoryWaves}>
            {[...Array(5)].map((_, i) => (
              <div
                key={`wave-${i}`}
                className={styles.memoryWave}
                style={{
                  animationDelay: `${i * 0.4}s`
                }}
              />
            ))}
          </div>
          
          {/* Nostalgic particles */}
          {[...Array(15)].map((_, i) => (
            <div
              key={`nostalgia-${i}`}
              className={styles.nostalgicParticle}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`
              }}
            />
          ))}
          
          {/* Memory echo effect */}
          <div className={styles.memoryEcho} />
        </div>
      )}

      {/* Chaotic Image Overlay for empty scenes */}
      {shouldShowChaosOverlay() && (
        <div className={styles.chaosImageOverlay}>
          {getChaosImages().slice(0, 5).map((imageSrc, index) => (
            <div
              key={`chaos-${index}`}
              className={styles.chaosImageContainer}
              style={{
                left: `${Math.random() * 80}%`,
                top: `${Math.random() * 80}%`,
                animationDelay: `${Math.random() * 2}s`,
                transform: `scale(${0.3 + Math.random() * 0.4}) rotate(${Math.random() * 360}deg)`,
                opacity: 0.3 + Math.random() * 0.4
              }}
            >
              <img
                src={imageSrc}
                alt="Chaos fragment"
                className={styles.chaosImage}
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      )}

      {/* Final Entropy Annihilation Effects */}
      {shouldShowEntropyAnnihilation() && (
        <>
          {/* Complete system breakdown overlay */}
          <div className={styles.entropyAnnihilationOverlay}>
            {/* Critical glitch matrix */}
            <div className={styles.criticalGlitchMatrix} />
            
            {/* Reality collapse effect */}
            <div className={styles.realityCollapse} />
            
            {/* Entropy cascade */}
            <div className={styles.entropyCascade}>
              {[...Array(20)].map((_, i) => (
                <div
                  key={`entropy-${i}`}
                  className={styles.entropyFragment}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`
                  }}
                />
              ))}
            </div>
            
            {/* System corruption waves */}
            <div className={styles.systemCorruption} />
            
            {/* Final dissolution */}
            <div className={styles.finalDissolution} />
            
            {/* Chaos storm */}
            <div className={styles.chaosStorm}>
              {getChaosImages().map((imageSrc, index) => (
                <div
                  key={`chaos-storm-${index}`}
                  className={styles.chaosStormImage}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1}s`,
                    animationDuration: `${0.5 + Math.random() * 1}s`
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Entropy fragment"
                    className={styles.chaosStormImageElement}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
            
            {/* Screen tear effects */}
            {[...Array(15)].map((_, i) => (
              <div
                key={`screen-tear-${i}`}
                className={styles.screenTear}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.3}s`
                }}
              />
            ))}
          </div>
          
          {/* Critical error message overlay */}
          <div className={styles.criticalErrorOverlay}>
            <div className={styles.errorMessage}>SYSTEM_FAILURE</div>
            <div className={styles.errorMessage}>ENTROPY_CASCADE</div>
            <div className={styles.errorMessage}>REALITY_CORRUPTED</div>
            <div className={styles.errorMessage}>ANNIHILATION_COMPLETE</div>
          </div>
        </>
      )}

      {/* Static Image for Node Choice */}
      {shouldShowNodeSelectionEffects() && (
        <div className={styles.nodeChoiceImage}>
          <div className={styles.nodeChoiceText}>
            <div className={styles.nodeTitle}>УЗЕЛ: ВЫБОР - ИЛЛЮЗИЯ.</div>
            <div className={styles.nodeSubtitle}>ПРОШЛОЕ ДИКТУЕТ КАЖДОЕ "ДА".</div>
            <div className={styles.nodeFooter}>NODE: DISPROVE.</div>
            <div className={styles.nodeFooterSub}>BUT EVEN PROOF IS PART OF THE CHAIN.</div>
          </div>
          <div className={styles.humanSilhouette} />
        </div>
      )}

      {/* Memory Node Image */}
      {shouldShowMemoryNodeEffects() && (
        <div className={styles.memoryNodeImage}>
          <img 
            src="/pic/photo_2025-09-11_19-35-40.png"
            alt="Memory Node visualization"
            className={styles.memoryImage}
            loading="lazy"
            decoding="async"
          />
          <div className={styles.memoryOverlayEffects} />
        </div>
      )}

      {/* GIF Screen - optimized loading */}
      {getSceneGif() && !shouldShowNodeSelectionEffects() && !shouldShowMemoryNodeEffects() && !shouldShowEntropyAnnihilation() && (
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
          {/* Render completed lines - these are memoized and won't re-render */}
          {completedLines.map((line, index) => (
            <CompletedLine 
              key={`completed-${index}`}
              line={line}
              index={index}
            />
          ))}
          
          {/* Render current typing line if within bounds */}
          {currentLineIndex < scene.dialogue.length && currentCharacter && (
            <CurrentTypingLine
              key={`current-${currentLineIndex}`}
              character={currentCharacter}
              currentText={currentText}
              lineIndex={currentLineIndex}
            />
          )}
        </div>

        {/* Choices */}
        {showChoices && (
          <div 
            className={`${styles.choices} ${styles.fadeIn}`}
          >
            {scene.choices
              .filter((choice) => {
                // Специальная логика для hub узлов
                if (currentSceneId === 'node_decision_hub') {
                  // Скрываем уже пройденные узлы
                  if (choice.text === 'Память' && completedNodes.has('node_memory')) return false;
                  if (choice.text === 'Выбор' && completedNodes.has('node_choice')) return false;
                  if (choice.text === 'Забвение' && completedNodes.has('node_oblivion')) return false;
                  
                  // Показываем "Завершить" только если все 3 узла пройдены
                  if (choice.text === 'Завершить') {
                    return completedNodes.has('node_memory') && 
                           completedNodes.has('node_choice') && 
                           completedNodes.has('node_oblivion');
                  }
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
  // Custom comparison for memo optimization - only re-render on significant changes
  return (
    prevProps.scene?.dialogue === nextProps.scene?.dialogue &&
    prevProps.completedNodes.size === nextProps.completedNodes.size &&
    prevProps.onChoice === nextProps.onChoice &&
    prevProps.currentSceneId === nextProps.currentSceneId
  );
});

// Add display names for better debugging
CompletedLine.displayName = 'CompletedLine';
CurrentTypingLine.displayName = 'CurrentTypingLine';