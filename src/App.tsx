import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import type { 
  Story, 
  Scene, 
  SavedProgress, 
  Achievement, 
  SoundType,
  Timeout,
  ChoiceHandler
} from '@/types/story';
import story from './story/story.json';
import './App.css';

// Lazy load ComicView for better initial load performance
const ComicView = lazy(() => import('./components/ComicView'));

// Note: Web Worker functionality removed for simplicity in TypeScript conversion

function App() {
  const [currentSceneId, setCurrentSceneId] = useState<string>(story.startScene);
  const [visitedScenes, setVisitedScenes] = useState<Set<string>>(() => new Set([story.startScene]));
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(() => new Set());
  const [showBirthdayMessage, setShowBirthdayMessage] = useState<boolean>(false);
  
  // Performance optimizations
  const audioContextRef = useRef<AudioContext | null>(null);
  const achievementQueueRef = useRef<Achievement[]>([]);
  const saveTimeoutRef = useRef<Timeout | null>(null);
  
  // Memoized current scene
  const currentScene = useMemo((): Scene => {
    const scene = (story as Story).scenes[currentSceneId];
    if (!scene) {
      throw new Error(`Scene "${currentSceneId}" not found`);
    }
    return scene;
  }, [currentSceneId]);
  
  // Memoized progress calculation
  const progress = useMemo((): number => {
    return Math.round((visitedScenes.size / Object.keys((story as Story).scenes).length) * 100);
  }, [visitedScenes]);
  
  // Initialize audio context lazily
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);
  
  // Load saved progress with error handling
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem('sergey_story_progress');
      if (savedProgress) {
        const parsed: SavedProgress = JSON.parse(savedProgress);
        setCurrentSceneId(parsed.scene || (story as Story).startScene);
        setVisitedScenes(new Set(parsed.visited || [(story as Story).startScene]));
        setAchievements(parsed.achievements || []);
        setCompletedNodes(new Set(parsed.nodes || []));
      }
      
      // Check birthday message
      const birthdayShown = localStorage.getItem('birthday_shown');
      setShowBirthdayMessage(!birthdayShown);
    } catch (error) {
      console.warn('Failed to load saved progress:', error);
    }
  }, []);
  
  // Debounced save progress
  const saveProgress = useCallback((): void => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce saves to reduce localStorage writes
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const progressData: SavedProgress = {
          scene: currentSceneId,
          visited: Array.from(visitedScenes),
          achievements,
          nodes: Array.from(completedNodes)
        };
        localStorage.setItem('sergey_story_progress', JSON.stringify(progressData));
      } catch (error) {
        console.warn('Failed to save progress:', error);
      }
    }, 1000); // Save after 1 second of inactivity
  }, [currentSceneId, visitedScenes, achievements, completedNodes]);
  
  // Save progress when state changes
  useEffect(() => {
    saveProgress();
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [saveProgress]);
  
  // Optimized achievement checking
  const checkAchievements = useCallback((): void => {
    const newAchievements: Achievement[] = [];
    
    // Achievement checks
    const achievementChecks: Achievement[] = [
      {
        id: 'first_steps',
        condition: visitedScenes.size >= 5,
        title: 'Первые шаги',
        description: 'Исследовано 5 сцен'
      },
      {
        id: 'memory_keeper',
        condition: visitedScenes.has('node_memory'),
        title: 'Хранитель памяти',
        description: 'Пройден узел Памяти'
      },
      {
        id: 'decision_maker',
        condition: visitedScenes.has('node_choice'),
        title: 'Творец выбора',
        description: 'Пройден узел Выбора'
      },
      {
        id: 'void_walker',
        condition: visitedScenes.has('node_oblivion'),
        title: 'Ходящий по пустоте',
        description: 'Пройден узел Забвения'
      },
      {
        id: 'enlightened',
        condition: visitedScenes.has('enlightenment'),
        title: 'Просветленный',
        description: 'Достигнуто просветление'
      },
      {
        id: 'explorer',
        condition: visitedScenes.size >= 20,
        title: 'Исследователь',
        description: 'Открыто 20 различных путей'
      }
    ];
    
    achievementChecks.forEach(check => {
      if (check.condition && !achievements.includes(check.id)) {
        newAchievements.push(check);
      }
    });
    
    // Queue achievements for display
    if (newAchievements.length > 0) {
      achievementQueueRef.current.push(...newAchievements);
      processAchievementQueue();
      
      setAchievements(prev => [
        ...prev,
        ...newAchievements.map(a => a.id)
      ]);
    }
  }, [visitedScenes, achievements]);
  
  // Process achievement notifications one at a time
  const processAchievementQueue = useCallback((): void => {
    if (achievementQueueRef.current.length === 0) return;
    
    const achievement = achievementQueueRef.current.shift();
    if (achievement) {
      showAchievement(achievement.title, achievement.description);
    }
    
    // Process next achievement after delay
    setTimeout(() => {
      processAchievementQueue();
    }, 3500);
  }, []);
  
  // Optimized achievement notification
  const showAchievement = useCallback((title: string, description: string): void => {
    // Create element only when needed
    requestAnimationFrame(() => {
      const achievementEl = document.createElement('div');
      achievementEl.className = 'achievement-notification';
      achievementEl.innerHTML = `
        <div class="achievement-icon">🏆</div>
        <div class="achievement-content">
          <div class="achievement-title">${title}</div>
          <div class="achievement-description">${description}</div>
        </div>
      `;
      document.body.appendChild(achievementEl);
      
      // Force reflow then add animation class
      achievementEl.offsetHeight;
      achievementEl.classList.add('show');
      
      setTimeout(() => {
        achievementEl.classList.remove('show');
        setTimeout(() => {
          if (document.body.contains(achievementEl)) {
            document.body.removeChild(achievementEl);
          }
        }, 300);
      }, 3000);
    });
  }, []);
  
  // Check achievements when scenes change
  useEffect(() => {
    checkAchievements();
  }, [visitedScenes]);
  
  // Optimized choice handler
  const handleChoice: ChoiceHandler = useCallback((nextSceneId: string) => {
    if (!(story as Story).scenes[nextSceneId]) {
      console.error(`Scene "${nextSceneId}" not found!`);
      
      // Show error notification
      const showError = () => {
        const errorEl = document.createElement('div');
        errorEl.className = 'error-notification';
        errorEl.innerHTML = `
          <div class="error-content">
            <div class="error-title">⚠️ Фрагмент не найден</div>
            <div class="error-description">Фрагмент истории "${nextSceneId}" пока не написан. Возвращаемся к началу узлов.</div>
          </div>
        `;
        document.body.appendChild(errorEl);
        
        requestAnimationFrame(() => {
          errorEl.classList.add('show');
          
          setTimeout(() => {
            errorEl.classList.remove('show');
            setTimeout(() => {
              if (document.body.contains(errorEl)) {
                document.body.removeChild(errorEl);
              }
            }, 300);
          }, 4000);
        });
      };
      
      showError();
      
      // Fallback to safe scene
      const fallbackScene = (story as Story).scenes['three_nodes_begin'] ? 'three_nodes_begin' : (story as Story).startScene;
      setTimeout(() => {
        setCurrentSceneId(fallbackScene);
        setVisitedScenes(prev => new Set([...prev, fallbackScene]));
      }, 2000);
      
      return;
    }
    
    // Track completed nodes based on ending scenes
    if (currentSceneId === 'memory_accepted' || currentSceneId === 'memory_rewritten') {
      setCompletedNodes(prev => new Set([...prev, 'node_memory']));
    }
    if (currentSceneId === 'conscious_choice' || currentSceneId === 'stoic_peace') {
      setCompletedNodes(prev => new Set([...prev, 'node_choice']));
    }
    if (currentSceneId === 'creative_immortality' || currentSceneId === 'oblivion_acceptance') {
      setCompletedNodes(prev => new Set([...prev, 'node_oblivion']));
    }
    
    // Update scene
    setCurrentSceneId(nextSceneId);
    setVisitedScenes(prev => new Set([...prev, nextSceneId]));
    
    // Play sound effect
    if (soundEnabled) {
      playSound('choice');
    }
  }, [currentSceneId, soundEnabled]);
  
  // Optimized sound playback
  const playSound = useCallback((type: SoundType): void => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'choice') {
        oscillator.frequency.value = 440;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      }
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }, [soundEnabled, getAudioContext]);
  
  // Reset progress handler
  const resetProgress = useCallback((): void => {
    localStorage.removeItem('sergey_story_progress');
    localStorage.removeItem('birthday_shown');
    setCurrentSceneId((story as Story).startScene);
    setVisitedScenes(new Set([(story as Story).startScene]));
    setAchievements([]);
    setCompletedNodes(new Set());
    setShowMenu(false);
    setShowBirthdayMessage(true);
  }, []);
  
  // Handle birthday message dismissal
  const handleBirthdayDismiss = useCallback((): void => {
    localStorage.setItem('birthday_shown', 'true');
    setShowBirthdayMessage(false);
  }, []);
  
  return (
    <div className="app">
      {/* Birthday message */}
      {showBirthdayMessage && currentSceneId === (story as Story).startScene && (
        <div className="birthday-message">
          <h1>🎂 С Днем Рождения, Сергей! 🎂</h1>
          <p>Эта интерактивная история - подарок для тебя</p>
          <button onClick={handleBirthdayDismiss}>
            Начать путешествие
          </button>
        </div>
      )}
      
      {/* Menu button */}
      <button 
        className="menu-button"
        onClick={() => setShowMenu(prev => !prev)}
        aria-label="Menu"
      >
        ☰
      </button>
      
      {/* Sound toggle */}
      <button 
        className="sound-button"
        onClick={() => setSoundEnabled(prev => !prev)}
        aria-label="Toggle sound"
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>
      
      {/* Progress bar */}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
        <span className="progress-text">{progress}%</span>
      </div>
      
      {/* Menu overlay */}
      {showMenu && (
        <div className="menu-overlay">
          <div className="menu-content">
            <h2>Меню</h2>
            
            <div className="menu-section">
              <h3>Прогресс</h3>
              <p>Исследовано сцен: {visitedScenes.size} / {Object.keys((story as Story).scenes).length}</p>
              <p>Завершено: {progress}%</p>
            </div>
            
            <div className="menu-section">
              <h3>Достижения ({achievements.length})</h3>
              <div className="achievements-list">
                {achievements.length === 0 ? (
                  <p className="no-achievements">Пока нет достижений</p>
                ) : (
                  achievements.map(achievement => (
                    <div key={achievement} className="achievement-item">
                      🏆 {achievement.replace(/_/g, ' ')}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="menu-actions">
              <button onClick={resetProgress} className="reset-button">
                Начать заново
              </button>
              <button onClick={() => setShowMenu(false)} className="close-button">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main comic view with lazy loading */}
      <Suspense fallback={
        <div className="loading">
          <div className="loadingText">Загрузка...</div>
        </div>
      }>
        <ComicView 
          scene={currentScene} 
          onChoice={handleChoice} 
          completedNodes={completedNodes}
          currentSceneId={currentSceneId}
        />
      </Suspense>
    </div>
  );
}

export default App;