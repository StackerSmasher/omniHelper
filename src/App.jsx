import React, { useState } from 'react';
import story from './story/story.json';
import ComicView from './components/ComicView';

function App() {
  const [currentSceneId, setCurrentSceneId] = useState(story.startScene);

  const handleChoice = (nextSceneId) => {
    if (story.scenes[nextSceneId]) {
      setCurrentSceneId(nextSceneId);
    } else {
      console.error(`Scene "${nextSceneId}" not found!`);
    }
  };

  const currentScene = story.scenes[currentSceneId];

  return (
    <div>
      <ComicView scene={currentScene} onChoice={handleChoice} />
    </div>
  );
}

export default App;