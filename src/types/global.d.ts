/**
 * Global type declarations for the application
 */

/// <reference types="react/jsx-runtime" />

// Extend the global window object for custom properties
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
    mozAudioContext?: typeof AudioContext;
    msAudioContext?: typeof AudioContext;
  }

  interface Navigator {
    deviceMemory?: number;
  }

  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

// JSON module declarations
declare module '*.json' {
  const value: any;
  export default value;
}

// Image file declarations
declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

// SVG as React component
declare module '*.svg?react' {
  import * as React from 'react';
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

export {};