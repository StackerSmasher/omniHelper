import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import styles from './ComicView.module.css';
// import { PerormanceMonitfor } from '../utils/PerformanceMonitor';

// Memoized character component for performance
const CharacterName = React.memo(({ character }) => (
  <span className={styles.character}>{character}:</span>
));

// Memoized message component with optimized rendering
const MessageText = React.memo(({ message, isComplete }) => (
  <span className={styles.message}>
    {message}
    {!isComplete && <span className={styles.cursor}>_</span>}
  </span>
));

const ComicView = ({ scene, onChoice, completedNodes = new Set() }) => {
  const [displayedLines, setDisplayedLines] = useState([]);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [gifPlayed, setGifPlayed] = useState({});
  const [deviceProfile, setDeviceProfile] = useState('medium');
  
  // Ref for performance monitoring
  const performanceMonitorRef = useRef(null);

  // Instantiate PerformanceMonitor
  useEffect(() => {
    performanceMonitorRef.current = new PerformanceMonitor();
  }, []);

  // Reset state when scene changes
  useEffect(() => {
    if (!scene) return;
    
    setDisplayedLines([]);
    setCurrentDialogueIndex(0);
    setIsTyping(false);
    setShowChoices(false);
    setSelectedChoice(null);
    // Don't reset gifPlayed - persist across scenes for the same GIF
  }, [scene]);

  // Typewriter effect for dialogue lines
  useEffect(() => {
    if (!scene || currentDialogueIndex >= scene.dialogue.length) {
      if (currentDialogueIndex >= scene.dialogue.length && !showChoices) {
        setTimeout(() => setShowChoices(true), 500);
      }
      return;
    }

    const currentLine = scene.dialogue[currentDialogueIndex];
    const character = currentLine.character;
    const message = currentLine.text;

    // Add new line entry
    setDisplayedLines(prev => [...prev, { character, displayedMessage: '', isComplete: false }]);
    setIsTyping(true);

    let charIndex = 0;
    
    const typewriterInterval = setInterval(() => {
      if (charIndex <= message.length) {
        setDisplayedLines(prev => {
          const newLines = [...prev];
          newLines[currentDialogueIndex].displayedMessage = message.substring(0, charIndex);
          return newLines;
        });
        charIndex++;
      } else {
        clearInterval(typewriterInterval);
        setDisplayedLines(prev => {
          const newLines = [...prev];
          newLines[currentDialogueIndex].isComplete = true;
          return newLines;
        });
        setIsTyping(false);
        setTimeout(() => {
          setCurrentDialogueIndex(prev => prev + 1);
        }, 1500);
      }
    }, 30);

    return () => clearInterval(typewriterInterval);
  }, [scene, currentDialogueIndex]);

  const handleChoice = useCallback((choice, index) => {
    setSelectedChoice(index);
    setTimeout(() => {
      onChoice(choice.nextScene);
    }, 500);
  }, [onChoice]);

  const applyGlitchEffects = useCallback((imageData, glitchTypes) => {
    const pixels = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    glitchTypes.forEach(glitchType => {
      switch(glitchType) {
        case 'cyberPulse':
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
                        pixels[idx] = Math.random() > 0.5 ? 255 : 0;     // Hot pink/red
                        pixels[idx + 1] = Math.random() * 50;           // Low green
                        pixels[idx + 2] = Math.random() > 0.3 ? 255 : 0; // Cyan/blue
                      } else {
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
          for (let y = 1; y < height - 1; y += 4) {
            for (let x = 1; x < width - 1; x += 4) {
              if (Math.random() > 0.85) {
                const currentIdx = (y * width + x) * 4;
                const driftIdx = ((y + 1) * width + x) * 4;
                
                if (currentIdx < pixels.length && driftIdx < pixels.length) {
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
  }, []);

  const handleGifLoad = useCallback((imgElement) => {
    const gifSrc = imgElement.src;
    if (gifPlayed[gifSrc] || deviceProfile === 'low') return; // Skip on low performance devices
    
    const allGlitchTypes = ['cyberPulse', 'dataCorruption', 'matrixRain', 'screenTear', 'ghosting', 'pixelDrift'];
    const numEffects = Math.floor(Math.random() * 2) + 1;
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
    
    const earlyGlitchInterval = setInterval(() => {
      if (isInFinalPhase || isGlitchingComplete) {
        clearInterval(earlyGlitchInterval);
        return;
      }
      
      if (Math.random() > 0.75) {
        ctx.drawImage(imgElement, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const lightEffects = ['cyberPulse', 'ghosting'];
        const effectToApply = lightEffects[Math.floor(Math.random() * lightEffects.length)];
        applyGlitchEffects(imageData, [effectToApply]);
        
        ctx.putImageData(imageData, 0, 0);
        imgElement.src = canvas.toDataURL();
      }
    }, 800 + Math.random() * 1200);
    
    setTimeout(() => {
      if (isGlitchingComplete) return;
      
      isInFinalPhase = true;
      clearInterval(earlyGlitchInterval);
      
      let finalGlitchCount = 0;
      const maxFinalGlitches = Math.floor(Math.random() * 2) + 2;
      
      const finalGlitchInterval = setInterval(() => {
        if (finalGlitchCount >= maxFinalGlitches || isGlitchingComplete) {
          clearInterval(finalGlitchInterval);
          setGifPlayed(prev => ({...prev, [gifSrc]: true}));
          return;
        }
        
        ctx.drawImage(imgElement, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const effectToApply = selectedGlitches[Math.floor(Math.random() * selectedGlitches.length)];
        applyGlitchEffects(imageData, [effectToApply]);
        
        ctx.putImageData(imageData, 0, 0);
        imgElement.src = canvas.toDataURL();
        
        finalGlitchCount++;
      }, 150 + Math.random() * 300);
      
    }, 3000);
    
    setTimeout(() => {
      isGlitchingComplete = true;
      clearInterval(earlyGlitchInterval);
      setGifPlayed(prev => ({...prev, [gifSrc]: true}));
    }, 10000);
  }, [gifPlayed, deviceProfile, applyGlitchEffects]);

  if (!scene) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>Загрузка...</div>
      </div>
    );
  }

  const getSceneAtmosphere = () => {
    if (scene.dialogue[0]?.character === 'Агент Пыли') return styles.agentScene;
    if (scene.dialogue[0]?.character === 'Узел Памяти') return styles.memoryScene;
    if (scene.dialogue[0]?.character === 'Узел Выбора') return styles.choiceScene;
    if (scene.dialogue[0]?.character === 'Узел Забвения') return styles.oblivionScene;
    return '';
  };

  const getSceneGif = () => {
    if (scene.dialogue[0]?.character === 'Голос из Пустоты') {
      return '/gifs/grok-video-431581ef-73ad-4e7e-ab52-75a3ce451c73.gif';
    }
    
    if (scene.dialogue[0]?.character === 'Рассказчик' && 
        scene.dialogue[0]?.text === 'Открытка в мусоре. Но отрицать - значит звать тени.') {
      return '/gifs/grok-video-4bfcceea-56f1-4883-b1fe-6af544eebb7a.gif';
    }
    
    if (scene.dialogue[0]?.character === 'Рассказчик' && 
        scene.dialogue[0]?.text.includes('Квартира - гроб тишины. Свет мигает, выхватывая НЕЧТО на мониторе')) {
      return '/gifs/grok-video-4ec6309b-9d5f-41f5-bc85-139ef398f2e0.gif';
    }
    
    if (
      (scene.dialogue[0]?.character === 'Сергей' && 
       scene.dialogue[0]?.text === 'Я принимаю огонь. Пусть жжет - в нем я оживаю.') ||
      (scene.dialogue[0]?.character === 'Рассказчик' && 
       scene.dialogue[0]?.text.includes('Экран мерцает. Лицо из пикселей смотрит в душу'))
    ) {
      return '/gifs/generated_video (2).gif';
    }
    
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

  const shouldShowElectricalEffects = () => {
    return scene.dialogue[0]?.character === 'Рассказчик' && 
           scene.dialogue[0]?.text.includes('Щиток гудит, провода дышат');
  };

  const generateElectricalSparks = useMemo(() => {
    const sparkCount = deviceProfile === 'low' ? 4 : deviceProfile === 'medium' ? 6 : 8;
    const sparks = [];
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

  const shouldShowMirrorEffects = () => {
    return scene.dialogue[0]?.character === 'Поток' && 
           scene.dialogue[0]?.text.includes('Тысячи жизней. Ты видишь себя в глазах других');
  };

  const shouldShowVoidEffects = () => {
    return scene.dialogue[0]?.character === 'Рассказчик' && 
           scene.dialogue[0]?.text.includes('НЕЧТО на мониторе - геометрию невозможных углов');
  };

  const shouldShowPostcardEffects = () => {
    return scene.dialogue[0]?.character === 'Рассказчик' && 
           scene.dialogue[0]?.text.includes('Черная открытка холодит пальцы');
  };

  const generateVoidElements = useMemo(() => {
    const fleshCount = deviceProfile === 'low' ? 6 : deviceProfile === 'medium' ? 9 : 12;
    const shadowCount = deviceProfile === 'low' ? 3 : deviceProfile === 'medium' ? 4 : 6;
    const elements = [];
    
    for (let i = 0; i < fleshCount; i++) {
      elements.push({
        type: 'flesh',
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 2
      });
    }
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

  const getDeviceClass = () => {
    if (deviceProfile === 'low') return styles.lowPerformance;
    if (deviceProfile === 'medium') return styles.mediumPerformance;
    if (deviceProfile === 'high') return styles.highPerformance;
    return '';
  };
  
  // Performance monitoring
  useEffect(() => {
    if (!performanceMonitorRef.current) return;
    
    const monitor = performanceMonitorRef.current;
    
    monitor.onPerformanceEvent('performance-critical', (data) => {
      console.warn('Critical performance issue detected:', data);
      
      if (data.renderTime > 50 && deviceProfile !== 'low') {
        const newProfile = deviceProfile === 'high' ? 'medium' : 'low';
        console.log(`Auto-downgrading device profile from ${deviceProfile} to ${newProfile}`);
        setDeviceProfile(newProfile);
      }
    });
    
    if (process.env.NODE_ENV === 'development') {
      const metricsInterval = setInterval(() => {
        const report = monitor.generateReport();
        console.log('Performance Report:', report);
      }, 10000);
      
      return () => clearInterval(metricsInterval);
    }
  }, [deviceProfile]);

  // Memoize particles for performance
  const particles = useMemo(() => {
    const count = deviceProfile === 'low' ? 10 : deviceProfile === 'medium' ? 20 : 30;
    return [...Array(count)].map((_, i) => (
      <div 
        key={i} 
        className={styles.particle}
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 10}s`,
          animationDuration: `${10 + Math.random() * 20}s`
        }}
      />
    ));
  }, [deviceProfile]);

  return (
    <div 
      className={`${styles.scene} ${getSceneAtmosphere()} ${getDeviceClass()}`}
      style={{
        transform: 'translateZ(0)',
        willChange: 'transform'
      }}
    >
      {/* Atmospheric particles */}
      <div className={styles.particles}>
        {particles}
      </div>

      {/* Glitch effect overlay */}
      <div className={styles.glitchOverlay} />

      {/* Electrical Effects */}
      {shouldShowElectricalEffects() && (
        <div className={styles.electricalOverlay}>
          <div className={styles.circuitLines} />
          
          <div 
            className={styles.electricPulse}
            style={{
              '--pulse-x': `${30 + Math.random() * 40}%`,
              '--pulse-y': `${30 + Math.random() * 40}%`
            }}
          />
          
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

      {/* Mirror/Reflection Effects */}
      {shouldShowMirrorEffects() && (
        <div className={styles.mirrorOverlay}>
          <div className={styles.mirrorFragment} />
          <div className={styles.mirrorFragment} />
          <div className={styles.mirrorFragment} />
          <div className={styles.mirrorFragment} />
          
          <div className={styles.reflectionRipple} />
          <div className={styles.reflectionRipple} />
          <div className={styles.reflectionRipple} />
          
          <div className={styles.identityShatter} />
        </div>
      )}

      {/* Void/NECHTO Effects */}
      {shouldShowVoidEffects() && (
        <div className={styles.voidOverlay}>
          <div className={styles.geometryGlitch} />
          <div className={styles.geometryGlitch} />
          <div className={styles.geometryGlitch} />
          
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
          
          <div className={styles.aggressiveFlicker} />
        </div>
      )}

      {/* Black Postcard Effects */}
      {shouldShowPostcardEffects() && (
        <div className={styles.postcardOverlay}>
          <div className={styles.metroVeins} />
          
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
          
          <div className={styles.coldTouch} />
          
          <div className={styles.birthdayPulse} />
        </div>
      )}

      {/* GIF Screen */}
      {getSceneGif() && (
        <div 
          className={styles.gifScreen}
          style={{
            transform: 'translateZ(0)',
            willChange: 'transform'
          }}
        >
          <img 
            src={getSceneGif()}
            alt="Cyberpunk scene"
            className={styles.gifImage}
            onLoad={(e) => handleGifLoad(e.target)}
            key={getSceneGif()}
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      {/* Dialogue container */}
      <div className={styles.dialogueContainer}>
        <div 
          className={styles.dialogueBox}
          style={{
            transform: 'translateZ(0)',
            willChange: isTyping ? 'contents' : 'auto'
          }}
        >
          {displayedLines.map((line, index) => {
            const renderTimer = performanceMonitorRef.current?.measureTextRender(`dialogue-line-${index}`);
            
            return (
              <div 
                key={`line-${index}`} 
                className={`${styles.dialogueLine} ${styles.fadeIn}`}
                style={{ 
                  animationDelay: `${index * 0.2}s`,
                  transform: 'translateZ(0)',
                  willChange: line.isComplete ? 'auto' : 'transform'
                }}
                ref={(el) => {
                  if (el && renderTimer) {
                    requestAnimationFrame(() => renderTimer.end());
                  }
                }}
              >
                <CharacterName character={line.character} />
                <MessageText 
                  message={line.displayedMessage} 
                  isComplete={line.isComplete}
                />
              </div>
            );
          })}
        </div>

        Choices
        {showChoices && (
          <div 
            className={`${styles.choices} ${styles.fadeIn}`}
            ref={(el) => {
              if (el && performanceMonitorRef.current) {
                const timer = performanceMonitorRef.current.measureTextRender('choices-render');
                requestAnimationFrame(() => timer?.end());
              }
            }}
          >
            {scene.choices
              .filter((choice) => {
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
    </div>
  );
};

// ComicView.displayName = 'OptimizedComicView';

export default React.memo(ComicView, (prevProps, nextProps) => {
  return (
    prevProps.scene?.dialogue === nextProps.scene?.dialogue &&
    prevProps.completedNodes.size === nextProps.completedNodes.size &&
    prevProps.onChoice === nextProps.onChoice
  );
});