import React, { useState, useEffect } from 'react';
import story from './story/story.json';
import ComicView from './components/ComicView';
import './App.css';

function App() {
  const [currentSceneId, setCurrentSceneId] = useState(story.startScene);
  const [visitedScenes, setVisitedScenes] = useState(new Set([story.startScene]));
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [completedNodes, setCompletedNodes] = useState(new Set());

  // Load saved progress
  useEffect(() => {
    const savedProgress = localStorage.getItem('sergey_story_progress');
    if (savedProgress) {
      const { scene, visited, achievements: savedAchievements, nodes } = JSON.parse(savedProgress);
      setCurrentSceneId(scene);
      setVisitedScenes(new Set(visited));
      setAchievements(savedAchievements || []);
      setCompletedNodes(new Set(nodes || []));
    }
    
    // Clear birthday flag for testing - remove this line after testing
    localStorage.removeItem('birthday_shown');
  }, []);

  // Save progress
  useEffect(() => {
    const progressData = {
      scene: currentSceneId,
      visited: Array.from(visitedScenes),
      achievements,
      nodes: Array.from(completedNodes)
    };
    localStorage.setItem('sergey_story_progress', JSON.stringify(progressData));
  }, [currentSceneId, visitedScenes, achievements, completedNodes]);

  // Check for achievements
  useEffect(() => {
    checkAchievements();
  }, [currentSceneId, visitedScenes]);

  const checkAchievements = () => {
    const newAchievements = [];
    
    // First steps achievement
    if (visitedScenes.size >= 5 && !achievements.includes('first_steps')) {
      newAchievements.push('first_steps');
      showAchievement('Первые шаги', 'Исследовано 5 сцен');
    }
    
    // Memory node achievement
    if (visitedScenes.has('node_memory') && !achievements.includes('memory_keeper')) {
      newAchievements.push('memory_keeper');
      showAchievement('Хранитель памяти', 'Пройден узел Памяти');
    }
    
    // Choice node achievement
    if (visitedScenes.has('node_choice') && !achievements.includes('decision_maker')) {
      newAchievements.push('decision_maker');
      showAchievement('Творец выбора', 'Пройден узел Выбора');
    }
    
    // Oblivion node achievement
    if (visitedScenes.has('node_oblivion') && !achievements.includes('void_walker')) {
      newAchievements.push('void_walker');
      showAchievement('Ходящий по пустоте', 'Пройден узел Забвения');
    }
    
    // Enlightenment achievement
    if (visitedScenes.has('enlightenment') && !achievements.includes('enlightened')) {
      newAchievements.push('enlightened');
      showAchievement('Просветленный', 'Достигнуто просветление');
    }
    
    // Explorer achievement
    if (visitedScenes.size >= 20 && !achievements.includes('explorer')) {
      newAchievements.push('explorer');
      showAchievement('Исследователь', 'Открыто 20 различных путей');
    }
    
    if (newAchievements.length > 0) {
      setAchievements(prev => [...prev, ...newAchievements]);
    }
  };

  const showAchievement = (title, description) => {
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
    
    setTimeout(() => {
      achievementEl.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      achievementEl.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(achievementEl);
      }, 300);
    }, 3000);
  };

  const handleChoice = (nextSceneId) => {
    if (story.scenes[nextSceneId]) {
      // Track completed nodes
      if (['node_memory', 'node_choice', 'node_oblivion'].includes(currentSceneId)) {
        setCompletedNodes(prev => new Set([...prev, currentSceneId]));
      }
      
      setCurrentSceneId(nextSceneId);
      setVisitedScenes(prev => new Set([...prev, nextSceneId]));
      
      // Play sound effect
      if (soundEnabled) {
        playSound('choice');
      }
    } else {
      console.error(`Scene "${nextSceneId}" not found!`);
      
      // Show error to user with fallback
      const errorMessage = `Фрагмент истории "${nextSceneId}" пока не написан. Возвращаемся к началу узлов.`;
      
      // Create error notification
      const errorEl = document.createElement('div');
      errorEl.className = 'error-notification';
      errorEl.innerHTML = `
        <div class="error-content">
          <div class="error-title">⚠️ Фрагмент не найден</div>
          <div class="error-description">${errorMessage}</div>
        </div>
      `;
      document.body.appendChild(errorEl);
      
      setTimeout(() => {
        errorEl.classList.add('show');
      }, 100);
      
      setTimeout(() => {
        errorEl.classList.remove('show');
        setTimeout(() => {
          if (document.body.contains(errorEl)) {
            document.body.removeChild(errorEl);
          }
        }, 300);
      }, 4000);
      
      // Fallback to three_nodes_begin or prologue
      const fallbackScene = story.scenes['three_nodes_begin'] ? 'three_nodes_begin' : story.startScene;
      setTimeout(() => {
        setCurrentSceneId(fallbackScene);
        setVisitedScenes(prev => new Set([...prev, fallbackScene]));
      }, 2000);
    }
  };

  const playSound = (type) => {
    // Create a simple sound effect using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
  };

  const resetProgress = () => {
    localStorage.removeItem('sergey_story_progress');
    localStorage.removeItem('birthday_shown');
    setCurrentSceneId(story.startScene);
    setVisitedScenes(new Set([story.startScene]));
    setAchievements([]);
    setCompletedNodes(new Set());
    setShowMenu(false);
  };

  const currentScene = story.scenes[currentSceneId];
  const progress = Math.round((visitedScenes.size / Object.keys(story.scenes).length) * 100);

  return (
    <div className="app">
      {/* Birthday message (shows only once) */}
      {currentSceneId === story.startScene && !localStorage.getItem('birthday_shown') && (
        <div className="birthday-message">
          <h1>🎂 С Днем Рождения, Сергей! 🎂</h1>
          <p>Эта интерактивная история - подарок для тебя</p>
          <button onClick={() => {
            localStorage.setItem('birthday_shown', 'true');
            document.querySelector('.birthday-message').style.display = 'none';
          }}>
            Начать путешествие
          </button>
        </div>
      )}

      {/* Menu button */}
      <button 
        className="menu-button"
        onClick={() => setShowMenu(!showMenu)}
        aria-label="Menu"
      >
        ☰
      </button>

      {/* Sound toggle */}
      <button 
        className="sound-button"
        onClick={() => setSoundEnabled(!soundEnabled)}
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
              <p>Исследовано сцен: {visitedScenes.size} / {Object.keys(story.scenes).length}</p>
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

      {/* Main comic view */}
      <ComicView scene={currentScene} onChoice={handleChoice} completedNodes={completedNodes} />
    </div>
  );
}

export default App;