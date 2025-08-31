import React, { useState, useEffect } from 'react';
import styles from './ComicView.module.css';

const ComicView = ({ scene, onChoice }) => {
  const [displayedText, setDisplayedText] = useState([]);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [showChoices, setShowChoices] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(null);

  useEffect(() => {
    if (!scene) return;
    
    // Reset state when scene changes
    setDisplayedText([]);
    setCurrentDialogueIndex(0);
    setIsTyping(true);
    setShowChoices(false);
    setSelectedChoice(null);
  }, [scene]);

  useEffect(() => {
    if (!scene || currentDialogueIndex >= scene.dialogue.length) {
      if (currentDialogueIndex >= scene.dialogue.length && !showChoices) {
        setTimeout(() => setShowChoices(true), 500);
      }
      return;
    }

    const currentLine = scene.dialogue[currentDialogueIndex];
    const text = `${currentLine.character}: ${currentLine.text}`;
    let charIndex = 0;
    
    const typewriterInterval = setInterval(() => {
      if (charIndex <= text.length) {
        setDisplayedText(prev => {
          const newText = [...prev];
          newText[currentDialogueIndex] = text.substring(0, charIndex);
          return newText;
        });
        charIndex++;
      } else {
        clearInterval(typewriterInterval);
        setTimeout(() => {
          setCurrentDialogueIndex(prev => prev + 1);
        }, 1500);
      }
    }, 30);

    return () => clearInterval(typewriterInterval);
  }, [scene, currentDialogueIndex]);

  const handleChoice = (choice, index) => {
    setSelectedChoice(index);
    setTimeout(() => {
      onChoice(choice.nextScene);
    }, 500);
  };

  if (!scene) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingText}>Загрузка...</div>
      </div>
    );
  }

  // Determine scene atmosphere based on current scene
  const getSceneAtmosphere = () => {
    if (scene.dialogue[0]?.character === 'Агент Пыли') return styles.agentScene;
    if (scene.dialogue[0]?.character === 'Узел Памяти') return styles.memoryScene;
    if (scene.dialogue[0]?.character === 'Узел Выбора') return styles.choiceScene;
    if (scene.dialogue[0]?.character === 'Узел Забвения') return styles.oblivionScene;
    return '';
  };

  return (
    <div className={`${styles.scene} ${getSceneAtmosphere()}`}>
      {/* Atmospheric particles */}
      <div className={styles.particles}>
        {[...Array(20)].map((_, i) => (
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

      {/* Dialogue container */}
      <div className={styles.dialogueContainer}>
        <div className={styles.dialogueBox}>
          {displayedText.map((text, index) => {
            const line = scene.dialogue[index];
            if (!line) return null;
            
            const [character, ...messageParts] = text.split(': ');
            const message = messageParts.join(': ');
            
            return (
              <div 
                key={index} 
                className={`${styles.dialogueLine} ${styles.fadeIn}`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <span className={styles.character}>{character}:</span>
                <span className={styles.message}>{message}</span>
                {index === displayedText.length - 1 && isTyping && (
                  <span className={styles.cursor}>_</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Choices */}
        {showChoices && (
          <div className={`${styles.choices} ${styles.fadeIn}`}>
            {scene.choices.map((choice, index) => (
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

export default ComicView;