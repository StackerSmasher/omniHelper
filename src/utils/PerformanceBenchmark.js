/**
 * Performance benchmark utility for measuring text rendering improvements
 * Provides before/after comparison and optimization validation
 */
export class PerformanceBenchmark {
  constructor() {
    this.metrics = new Map();
    this.baselineMetrics = null;
    this.isRunning = false;
  }

  /**
   * Start benchmarking session
   */
  startBenchmark(testName = 'default') {
    if (this.isRunning) {
      console.warn('Benchmark already running');
      return;
    }

    this.isRunning = true;
    this.currentTest = testName;
    this.metrics.clear();

    console.log(`🚀 Starting performance benchmark: ${testName}`);
    this.startTime = performance.now();

    // Monitor frame rate
    this.frameCount = 0;
    this.lastFrameTime = this.startTime;
    this.monitorFrames();

    // Monitor memory if available
    if (performance.memory) {
      this.initialMemory = performance.memory.usedJSHeapSize;
    }

    return this;
  }

  /**
   * Record a specific metric
   */
  recordMetric(name, value, unit = 'ms') {
    if (!this.isRunning) {
      console.warn('No active benchmark session');
      return;
    }

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name).push({
      value,
      unit,
      timestamp: performance.now() - this.startTime
    });
  }

  /**
   * Measure function execution time
   */
  measureFunction(name, fn, iterations = 1) {
    if (!this.isRunning) {
      console.warn('No active benchmark session');
      return;
    }

    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const result = fn();
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    this.recordMetric(`${name}_avg`, avgTime, 'ms');
    this.recordMetric(`${name}_min`, minTime, 'ms');
    this.recordMetric(`${name}_max`, maxTime, 'ms');

    return {
      average: avgTime,
      min: minTime,
      max: maxTime,
      samples: times.length
    };
  }

  /**
   * Monitor frame rate during benchmark
   */
  monitorFrames() {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    this.frameCount++;

    const deltaTime = currentTime - this.lastFrameTime;
    if (deltaTime >= 1000) { // Every second
      const fps = (this.frameCount / deltaTime) * 1000;
      this.recordMetric('fps', fps, 'fps');
      
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
    }

    if (this.isRunning) {
      requestAnimationFrame(() => this.monitorFrames());
    }
  }

  /**
   * Stop benchmarking and generate report
   */
  stopBenchmark() {
    if (!this.isRunning) {
      console.warn('No active benchmark session');
      return null;
    }

    this.isRunning = false;
    const endTime = performance.now();
    const totalTime = endTime - this.startTime;

    // Calculate final memory usage
    let memoryUsed = 0;
    if (performance.memory && this.initialMemory) {
      memoryUsed = performance.memory.usedJSHeapSize - this.initialMemory;
    }

    // Generate comprehensive report
    const report = this.generateReport(totalTime, memoryUsed);
    
    console.log(`✅ Benchmark completed: ${this.currentTest}`);
    console.log('📊 Performance Report:', report);

    return report;
  }

  /**
   * Generate detailed performance report
   */
  generateReport(totalTime, memoryUsed) {
    const report = {
      testName: this.currentTest,
      totalTime: Math.round(totalTime * 100) / 100,
      memoryUsed: Math.round((memoryUsed / 1024 / 1024) * 100) / 100, // MB
      metrics: {},
      summary: {},
      recommendations: []
    };

    // Process all recorded metrics
    for (const [name, measurements] of this.metrics) {
      const values = measurements.map(m => m.value);
      const unit = measurements[0]?.unit || 'ms';

      report.metrics[name] = {
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
        unit: unit
      };
    }

    // Calculate performance score
    report.summary = this.calculatePerformanceScore(report.metrics);

    // Generate optimization recommendations
    report.recommendations = this.generateRecommendations(report.metrics);

    return report;
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore(metrics) {
    let score = 100;
    const summary = {
      rating: 'A',
      score: 100,
      issues: []
    };

    // Check FPS
    if (metrics.fps) {
      const avgFPS = metrics.fps.average;
      if (avgFPS < 30) {
        score -= 30;
        summary.issues.push('Low frame rate detected');
      } else if (avgFPS < 45) {
        score -= 15;
        summary.issues.push('Moderate frame rate issues');
      }
    }

    // Check text rendering times
    const textMetrics = Object.keys(metrics).filter(key => 
      key.includes('text') || key.includes('dialogue') || key.includes('typewriter')
    );

    textMetrics.forEach(key => {
      const metric = metrics[key];
      if (metric.average > 16.67) { // More than one frame at 60fps
        score -= 10;
        summary.issues.push(`Slow ${key} rendering`);
      }
    });

    // Assign letter grade
    summary.score = Math.max(0, score);
    if (score >= 90) summary.rating = 'A';
    else if (score >= 80) summary.rating = 'B';
    else if (score >= 70) summary.rating = 'C';
    else if (score >= 60) summary.rating = 'D';
    else summary.rating = 'F';

    return summary;
  }

  /**
   * Generate specific optimization recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    // FPS recommendations
    if (metrics.fps && metrics.fps.average < 45) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        issue: 'Low frame rate',
        suggestion: 'Enable low-performance mode or reduce particle effects'
      });
    }

    // Text rendering recommendations
    const textRenderingIssues = Object.keys(metrics).filter(key => {
      const metric = metrics[key];
      return key.includes('text') && metric.average > 20;
    });

    if (textRenderingIssues.length > 0) {
      recommendations.push({
        type: 'text-rendering',
        priority: 'medium',
        issue: 'Slow text rendering detected',
        suggestion: 'Consider reducing typewriter speed or enabling text buffering'
      });
    }

    // Memory recommendations
    if (metrics.memory && metrics.memory.average > 100) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        issue: 'High memory usage',
        suggestion: 'Enable dialogue cleanup and reduce scene caching'
      });
    }

    return recommendations;
  }

  /**
   * Compare with baseline metrics
   */
  compareWithBaseline(currentReport) {
    if (!this.baselineMetrics) {
      this.baselineMetrics = currentReport;
      return {
        isBaseline: true,
        message: 'Baseline metrics established'
      };
    }

    const improvements = {};
    const regressions = {};

    // Compare key metrics
    Object.keys(currentReport.metrics).forEach(key => {
      const current = currentReport.metrics[key];
      const baseline = this.baselineMetrics.metrics[key];

      if (!baseline) return;

      const improvement = ((baseline.average - current.average) / baseline.average) * 100;
      
      if (improvement > 5) {
        improvements[key] = improvement;
      } else if (improvement < -5) {
        regressions[key] = Math.abs(improvement);
      }
    });

    return {
      isBaseline: false,
      improvements,
      regressions,
      scoreChange: currentReport.summary.score - this.baselineMetrics.summary.score,
      message: Object.keys(improvements).length > 0 
        ? 'Performance improvements detected!' 
        : Object.keys(regressions).length > 0 
          ? 'Performance regressions detected'
          : 'Performance unchanged'
    };
  }

  /**
   * Save metrics for later comparison
   */
  setBaseline(report) {
    this.baselineMetrics = report;
    console.log('📈 Baseline metrics saved for future comparisons');
  }

  /**
   * Test specific visual novel scenarios
   */
  async runVisualNovelBenchmark() {
    this.startBenchmark('visual-novel-comprehensive');

    // Test typewriter animation
    await this.testTypewriterPerformance();
    
    // Test scene transitions
    await this.testSceneTransitions();
    
    // Test particle effects
    await this.testParticleEffects();
    
    // Test choice rendering
    await this.testChoiceRendering();

    return this.stopBenchmark();
  }

  async testTypewriterPerformance() {
    const testText = "This is a sample dialogue line for testing typewriter animation performance.";
    
    return new Promise((resolve) => {
      let charIndex = 0;
      const startTime = performance.now();
      
      const typeChar = () => {
        if (charIndex >= testText.length) {
          const endTime = performance.now();
          this.recordMetric('typewriter_complete', endTime - startTime);
          resolve();
          return;
        }
        
        const charTime = performance.now();
        // Simulate character rendering
        charIndex++;
        this.recordMetric('typewriter_char', performance.now() - charTime);
        
        setTimeout(typeChar, 30); // Simulate 30ms typing speed
      };
      
      typeChar();
    });
  }

  async testSceneTransitions() {
    const start = performance.now();
    
    // Simulate scene change operations
    await new Promise(resolve => {
      setTimeout(() => {
        this.recordMetric('scene_transition', performance.now() - start);
        resolve();
      }, 100);
    });
  }

  async testParticleEffects() {
    const start = performance.now();
    
    // Simulate particle rendering
    for (let i = 0; i < 20; i++) {
      const particleStart = performance.now();
      // Simulate particle calculation
      Math.random() * Math.random();
      this.recordMetric('particle_render', performance.now() - particleStart);
    }
  }

  async testChoiceRendering() {
    const start = performance.now();
    
    // Simulate choice button rendering
    for (let i = 0; i < 4; i++) {
      const choiceStart = performance.now();
      // Simulate choice processing
      setTimeout(() => {
        this.recordMetric('choice_render', performance.now() - choiceStart);
      }, 10);
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Export results for external analysis
   */
  exportResults(format = 'json') {
    if (format === 'json') {
      return JSON.stringify({
        baseline: this.baselineMetrics,
        allMetrics: Array.from(this.metrics.entries())
      }, null, 2);
    }
    
    if (format === 'csv') {
      let csv = 'Metric,Average,Min,Max,Unit\n';
      for (const [name, data] of this.metrics) {
        const values = data.map(d => d.value);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const unit = data[0]?.unit || 'ms';
        csv += `${name},${avg},${min},${max},${unit}\n`;
      }
      return csv;
    }
  }
}

// Export singleton instance for easy use
export const benchmark = new PerformanceBenchmark();

// Utility function for quick performance tests
export const quickBenchmark = (name, fn, iterations = 10) => {
  return benchmark.measureFunction(name, fn, iterations);
};