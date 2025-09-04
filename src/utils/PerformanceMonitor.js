// /**
//  * Performance monitoring utility for visual novel text rendering optimization
//  * Tracks render times, frame drops, and provides adaptive optimization suggestions
//  */
// export class PerformanceMonitor {
//   constructor(options = {}) {
//     this.options = {
//       sampleSize: options.sampleSize || 60,
//       targetFPS: options.targetFPS || 60,
//       warningThreshold: options.warningThreshold || 16.67, // ~60fps
//       criticalThreshold: options.criticalThreshold || 33.33, // ~30fps
//       enableDetailedProfiling: options.enableDetailedProfiling || false,
//       ...options
//     };

//     this.metrics = {
//       renderTimes: [],
//       frameDrops: 0,
//       averageFPS: 60,
//       textRenderTime: 0,
//       animationTime: 0,
//       totalElements: 0,
//       memoryUsage: 0
//     };

//     this.observers = new Map();
//     this.isMonitoring = false;
//     this.lastFrameTime = performance.now();
//   }

//   /**
//    * Start performance monitoring
//    */
//   startMonitoring() {
//     if (this.isMonitoring) return;
    
//     this.isMonitoring = true;
//     this.lastFrameTime = performance.now();
    
//     // Monitor frame rate
//     this.frameMonitorId = requestAnimationFrame(this.monitorFrames.bind(this));
    
//     // Monitor memory usage if available
//     if (performance.memory) {
//       this.memoryMonitorId = setInterval(() => {
//         this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
//       }, 1000);
//     }

//     // Monitor DOM mutations for element count
//     if (this.options.enableDetailedProfiling) {
//       this.setupMutationObserver();
//     }
//   }

//   /**
//    * Stop performance monitoring
//    */
//   stopMonitoring() {
//     if (!this.isMonitoring) return;
    
//     this.isMonitoring = false;
    
//     if (this.frameMonitorId) {
//       cancelAnimationFrame(this.frameMonitorId);
//     }
    
//     if (this.memoryMonitorId) {
//       clearInterval(this.memoryMonitorId);
//     }

//     if (this.mutationObserver) {
//       this.mutationObserver.disconnect();
//     }
//   }

//   /**
//    * Monitor frame rendering performance
//    */
//   monitorFrames(currentTime) {
//     const deltaTime = currentTime - this.lastFrameTime;
//     const fps = 1000 / deltaTime;
    
//     this.metrics.renderTimes.push(deltaTime);
    
//     // Keep only recent samples
//     if (this.metrics.renderTimes.length > this.options.sampleSize) {
//       this.metrics.renderTimes.shift();
//     }

//     // Calculate average FPS
//     this.metrics.averageFPS = this.metrics.renderTimes.reduce((sum, time) => sum + (1000 / time), 0) / this.metrics.renderTimes.length;

//     // Track frame drops
//     if (deltaTime > this.options.warningThreshold) {
//       this.metrics.frameDrops++;
//     }

//     this.lastFrameTime = currentTime;
    
//     if (this.isMonitoring) {
//       this.frameMonitorId = requestAnimationFrame(this.monitorFrames.bind(this));
//     }
//   }

//   /**
//    * Measure text rendering performance
//    */
//   measureTextRender(operation) {
//     const startTime = performance.now();
    
//     return {
//       end: () => {
//         const endTime = performance.now();
//         this.metrics.textRenderTime = endTime - startTime;
        
//         // Notify observers if performance is degraded
//         if (this.metrics.textRenderTime > this.options.criticalThreshold) {
//           this.notifyObservers('performance-critical', {
//             renderTime: this.metrics.textRenderTime,
//             operation: operation
//           });
//         }
//       }
//     };
//   }

//   /**
//    * Measure animation performance
//    */
//   measureAnimation(animationType) {
//     const startTime = performance.now();
    
//     return {
//       end: () => {
//         const endTime = performance.now();
//         this.metrics.animationTime = endTime - startTime;
        
//         return {
//           duration: this.metrics.animationTime,
//           fps: this.metrics.averageFPS,
//           isSmooth: this.metrics.animationTime < this.options.warningThreshold
//         };
//       }
//     };
//   }

//   /**
//    * Get current performance metrics
//    */
//   getMetrics() {
//     return {
//       ...this.metrics,
//       isPerformant: this.metrics.averageFPS > 55 && this.metrics.frameDrops < 5,
//       memoryPressure: this.metrics.memoryUsage > 100,
//       recommendations: this.getOptimizationRecommendations()
//     };
//   }

//   /**
//    * Get optimization recommendations based on current performance
//    */
//   getOptimizationRecommendations() {
//     const recommendations = [];
    
//     if (this.metrics.averageFPS < 45) {
//       recommendations.push({
//         type: 'fps',
//         severity: 'high',
//         message: 'Low frame rate detected',
//         suggestions: [
//           'Reduce particle effects',
//           'Disable complex animations',
//           'Use transform instead of position changes',
//           'Enable will-change CSS property'
//         ]
//       });
//     }

//     if (this.metrics.textRenderTime > 20) {
//       recommendations.push({
//         type: 'text-rendering',
//         severity: 'medium',
//         message: 'Slow text rendering',
//         suggestions: [
//           'Implement text virtualization',
//           'Use requestAnimationFrame for typing animation',
//           'Cache rendered text elements',
//           'Reduce text complexity'
//         ]
//       });
//     }

//     if (this.metrics.memoryUsage > 150) {
//       recommendations.push({
//         type: 'memory',
//         severity: 'medium',
//         message: 'High memory usage',
//         suggestions: [
//           'Clear old dialogue from DOM',
//           'Implement text buffer cleanup',
//           'Reduce image/GIF caching',
//           'Use WeakMap for temporary references'
//         ]
//       });
//     }

//     if (this.metrics.frameDrops > 10) {
//       recommendations.push({
//         type: 'frame-drops',
//         severity: 'high',
//         message: 'Frequent frame drops detected',
//         suggestions: [
//           'Reduce concurrent animations',
//           'Use CSS transforms for animations',
//           'Implement frame rate limiting',
//           'Profile JavaScript execution'
//         ]
//       });
//     }

//     return recommendations;
//   }

//   /**
//    * Setup DOM mutation observer for detailed profiling
//    */
//   setupMutationObserver() {
//     this.mutationObserver = new MutationObserver((mutations) => {
//       let addedNodes = 0;
//       let removedNodes = 0;
      
//       mutations.forEach(mutation => {
//         addedNodes += mutation.addedNodes.length;
//         removedNodes += mutation.removedNodes.length;
//       });
      
//       this.metrics.totalElements += (addedNodes - removedNodes);
//     });

//     this.mutationObserver.observe(document.body, {
//       childList: true,
//       subtree: true
//     });
//   }

//   /**
//    * Register performance event observer
//    */
//   onPerformanceEvent(eventType, callback) {
//     if (!this.observers.has(eventType)) {
//       this.observers.set(eventType, new Set());
//     }
//     this.observers.get(eventType).add(callback);
//   }

//   /**
//    * Notify observers of performance events
//    */
//   notifyObservers(eventType, data) {
//     if (this.observers.has(eventType)) {
//       this.observers.get(eventType).forEach(callback => {
//         try {
//           callback(data);
//         } catch (error) {
//           console.warn('Performance monitor observer error:', error);
//         }
//       });
//     }
//   }

//   /**
//    * Generate performance report
//    */
//   generateReport() {
//     const metrics = this.getMetrics();
//     const avgRenderTime = metrics.renderTimes.reduce((sum, time) => sum + time, 0) / metrics.renderTimes.length;
    
//     return {
//       timestamp: new Date().toISOString(),
//       summary: {
//         averageFPS: Math.round(metrics.averageFPS),
//         averageRenderTime: Math.round(avgRenderTime * 100) / 100,
//         frameDrops: metrics.frameDrops,
//         memoryUsage: Math.round(metrics.memoryUsage * 100) / 100,
//         performanceRating: this.calculatePerformanceRating(metrics)
//       },
//       details: metrics,
//       recommendations: metrics.recommendations
//     };
//   }

//   /**
//    * Calculate overall performance rating
//    */
//   calculatePerformanceRating(metrics) {
//     let score = 100;
    
//     // FPS penalty
//     if (metrics.averageFPS < 30) score -= 40;
//     else if (metrics.averageFPS < 45) score -= 20;
//     else if (metrics.averageFPS < 55) score -= 10;
    
//     // Frame drops penalty
//     score -= Math.min(metrics.frameDrops * 2, 20);
    
//     // Memory usage penalty
//     if (metrics.memoryUsage > 200) score -= 20;
//     else if (metrics.memoryUsage > 150) score -= 10;
    
//     // Text render time penalty
//     if (metrics.textRenderTime > 30) score -= 15;
//     else if (metrics.textRenderTime > 20) score -= 10;
    
//     return {
//       score: Math.max(0, score),
//       grade: this.getPerformanceGrade(Math.max(0, score))
//     };
//   }

//   /**
//    * Get performance grade based on score
//    */
//   getPerformanceGrade(score) {
//     if (score >= 90) return 'A';
//     if (score >= 80) return 'B';
//     if (score >= 70) return 'C';
//     if (score >= 60) return 'D';
//     return 'F';
//   }

//   /**
//    * Clean up resources
//    */
//   cleanup() {
//     this.stopMonitoring();
//     this.observers.clear();
//     this.metrics = {
//       renderTimes: [],
//       frameDrops: 0,
//       averageFPS: 60,
//       textRenderTime: 0,
//       animationTime: 0,
//       totalElements: 0,
//       memoryUsage: 0
//     };
//   }
// }