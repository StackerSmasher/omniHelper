import React from 'react';
import styles from './ComicView.module.css';

const ComicView = ({ scene, onChoice }) => {
  if (!scene) {
    return <div>Loading...</div>;
  }

  const backgroundStyle = {
    // In a real app, you would use scene.background
    // backgroundImage: `url(${scene.background})`,
    backgroundColor: '#1a0f1f', // Placeholder color
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <div className={styles.scene} style={backgroundStyle}>
      <div className={styles.dialogueBox}>
        {scene.dialogue.map((line, index) => (
          <p key={index}>
            <strong>{line.character}:</strong> {line.text}
          </p>
        ))}
      </div>
      <div className={styles.choices}>
        {scene.choices.map((choice, index) => (
          <button key={index} onClick={() => onChoice(choice.nextScene)}>
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ComicView;
