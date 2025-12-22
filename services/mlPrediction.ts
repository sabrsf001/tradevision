/**
 * ML Price Prediction Service for TradeVision
 * TensorFlow.js integration for price predictions
 */

import * as tf from '@tensorflow/tfjs';
import type { CandleData } from '../types';

// ============================================
// Types
// ============================================
export interface PredictionResult {
  predictedPrice: number;
  confidence: number;
  direction: 'up' | 'down' | 'neutral';
  timestamp: number;
  horizon: string;
}

export interface ModelConfig {
  lookback: number;
  epochs: number;
  batchSize: number;
  learningRate: number;
  hiddenUnits: number[];
}

export interface TrainingProgress {
  epoch: number;
  loss: number;
  valLoss?: number;
  progress: number;
}

// ============================================
// Data Preprocessing
// ============================================
function normalizeData(data: number[]): { normalized: number[]; min: number; max: number } {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  return {
    normalized: data.map((v) => (v - min) / range),
    min,
    max,
  };
}

function denormalize(value: number, min: number, max: number): number {
  return value * (max - min) + min;
}

function createSequences(
  data: number[],
  lookback: number
): { X: number[][]; y: number[] } {
  const X: number[][] = [];
  const y: number[] = [];
  
  for (let i = lookback; i < data.length; i++) {
    X.push(data.slice(i - lookback, i));
    y.push(data[i]);
  }
  
  return { X, y };
}

// ============================================
// LSTM Model
// ============================================
export class PricePredictionModel {
  private model: tf.Sequential | null = null;
  private config: ModelConfig;
  private normParams: { min: number; max: number } | null = null;
  
  constructor(config: Partial<ModelConfig> = {}) {
    this.config = {
      lookback: 30,
      epochs: 50,
      batchSize: 32,
      learningRate: 0.001,
      hiddenUnits: [64, 32],
      ...config,
    };
  }
  
  private buildModel(): tf.Sequential {
    const model = tf.sequential();
    
    // LSTM layer
    model.add(tf.layers.lstm({
      units: this.config.hiddenUnits[0],
      inputShape: [this.config.lookback, 1],
      returnSequences: this.config.hiddenUnits.length > 1,
    }));
    
    // Additional LSTM layers
    for (let i = 1; i < this.config.hiddenUnits.length; i++) {
      model.add(tf.layers.lstm({
        units: this.config.hiddenUnits[i],
        returnSequences: i < this.config.hiddenUnits.length - 1,
      }));
    }
    
    // Dropout for regularization
    model.add(tf.layers.dropout({ rate: 0.2 }));
    
    // Dense output layer
    model.add(tf.layers.dense({ units: 1 }));
    
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });
    
    return model;
  }
  
  async train(
    candles: CandleData[],
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<tf.History> {
    const closes = candles.map((c) => c.close);
    const { normalized, min, max } = normalizeData(closes);
    this.normParams = { min, max };
    
    const { X, y } = createSequences(normalized, this.config.lookback);
    
    // Convert to tensors
    const xTensor = tf.tensor3d(
      X.map((seq) => seq.map((v) => [v])),
      [X.length, this.config.lookback, 1]
    );
    const yTensor = tf.tensor2d(y, [y.length, 1]);
    
    // Build model
    this.model = this.buildModel();
    
    // Train
    const history = await this.model.fit(xTensor, yTensor, {
      epochs: this.config.epochs,
      batchSize: this.config.batchSize,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          onProgress?.({
            epoch: epoch + 1,
            loss: logs?.loss || 0,
            valLoss: logs?.val_loss,
            progress: (epoch + 1) / this.config.epochs,
          });
        },
      },
    });
    
    // Cleanup tensors
    xTensor.dispose();
    yTensor.dispose();
    
    return history;
  }
  
  predict(candles: CandleData[]): PredictionResult | null {
    if (!this.model || !this.normParams) {
      console.warn('Model not trained');
      return null;
    }
    
    const closes = candles.slice(-this.config.lookback).map((c) => c.close);
    if (closes.length < this.config.lookback) {
      console.warn('Insufficient data for prediction');
      return null;
    }
    
    // Normalize input
    const normalizedInput = closes.map(
      (v) => (v - this.normParams!.min) / (this.normParams!.max - this.normParams!.min)
    );
    
    // Create tensor
    const inputTensor = tf.tensor3d(
      [normalizedInput.map((v) => [v])],
      [1, this.config.lookback, 1]
    );
    
    // Predict
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const predictedNormalized = prediction.dataSync()[0];
    
    // Denormalize
    const predictedPrice = denormalize(
      predictedNormalized,
      this.normParams.min,
      this.normParams.max
    );
    
    // Calculate confidence based on recent volatility
    const recentPrices = closes.slice(-10);
    const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const volatility = Math.sqrt(
      recentPrices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / recentPrices.length
    );
    const confidence = Math.max(0, Math.min(1, 1 - volatility / avgPrice));
    
    // Determine direction
    const currentPrice = closes[closes.length - 1];
    const priceDiff = predictedPrice - currentPrice;
    const threshold = currentPrice * 0.001; // 0.1% threshold
    const direction: 'up' | 'down' | 'neutral' =
      priceDiff > threshold ? 'up' : priceDiff < -threshold ? 'down' : 'neutral';
    
    // Cleanup
    inputTensor.dispose();
    prediction.dispose();
    
    return {
      predictedPrice,
      confidence,
      direction,
      timestamp: Date.now(),
      horizon: '1 candle',
    };
  }
  
  async predictMultiple(
    candles: CandleData[],
    steps: number = 5
  ): Promise<PredictionResult[]> {
    const predictions: PredictionResult[] = [];
    let currentCandles = [...candles];
    
    for (let i = 0; i < steps; i++) {
      const prediction = this.predict(currentCandles);
      if (!prediction) break;
      
      predictions.push({
        ...prediction,
        horizon: `${i + 1} candle${i > 0 ? 's' : ''}`,
      });
      
      // Add predicted candle for next iteration
      const lastCandle = currentCandles[currentCandles.length - 1];
      currentCandles.push({
        time: lastCandle.time + 86400, // Assume 1D candles
        open: prediction.predictedPrice,
        high: prediction.predictedPrice * 1.01,
        low: prediction.predictedPrice * 0.99,
        close: prediction.predictedPrice,
        volume: lastCandle.volume,
      });
    }
    
    return predictions;
  }
  
  async save(name: string = 'tradevision-model'): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }
    
    await this.model.save(`localstorage://${name}`);
    
    // Save normalization params
    localStorage.setItem(
      `${name}-params`,
      JSON.stringify({
        normParams: this.normParams,
        config: this.config,
      })
    );
  }
  
  async load(name: string = 'tradevision-model'): Promise<boolean> {
    try {
      this.model = await tf.loadLayersModel(`localstorage://${name}`) as tf.Sequential;
      
      const params = localStorage.getItem(`${name}-params`);
      if (params) {
        const parsed = JSON.parse(params);
        this.normParams = parsed.normParams;
        this.config = parsed.config;
      }
      
      return true;
    } catch {
      console.warn('No saved model found');
      return false;
    }
  }
  
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}

// ============================================
// Simple Trend Classifier (Lightweight Alternative)
// ============================================
export class TrendClassifier {
  private model: tf.Sequential | null = null;
  
  async train(candles: CandleData[]): Promise<void> {
    const features: number[][] = [];
    const labels: number[] = [];
    
    for (let i = 10; i < candles.length - 1; i++) {
      // Features: returns, volume change, volatility
      const returns = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
      const sma5 = candles.slice(i - 5, i).reduce((s, c) => s + c.close, 0) / 5;
      const sma10 = candles.slice(i - 10, i).reduce((s, c) => s + c.close, 0) / 10;
      const rsi = this.calculateRSI(candles.slice(i - 14, i + 1));
      
      features.push([
        returns,
        (candles[i].close - sma5) / sma5,
        (candles[i].close - sma10) / sma10,
        rsi / 100,
        (candles[i].volume || 0) / (candles[i - 1].volume || 1),
      ]);
      
      // Label: 1 if price goes up, 0 if down
      labels.push(candles[i + 1].close > candles[i].close ? 1 : 0);
    }
    
    const xTensor = tf.tensor2d(features);
    const yTensor = tf.tensor2d(labels, [labels.length, 1]);
    
    this.model = tf.sequential();
    this.model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [5] }));
    this.model.add(tf.layers.dropout({ rate: 0.2 }));
    this.model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    this.model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
    
    this.model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });
    
    await this.model.fit(xTensor, yTensor, {
      epochs: 30,
      batchSize: 32,
      validationSplit: 0.2,
    });
    
    xTensor.dispose();
    yTensor.dispose();
  }
  
  predict(candles: CandleData[]): { probability: number; direction: 'up' | 'down' } | null {
    if (!this.model || candles.length < 15) return null;
    
    const i = candles.length - 1;
    const returns = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
    const sma5 = candles.slice(i - 5, i).reduce((s, c) => s + c.close, 0) / 5;
    const sma10 = candles.slice(i - 10, i).reduce((s, c) => s + c.close, 0) / 10;
    const rsi = this.calculateRSI(candles.slice(i - 14, i + 1));
    
    const features = tf.tensor2d([[
      returns,
      (candles[i].close - sma5) / sma5,
      (candles[i].close - sma10) / sma10,
      rsi / 100,
      (candles[i].volume || 0) / (candles[i - 1].volume || 1),
    ]]);
    
    const prediction = this.model.predict(features) as tf.Tensor;
    const probability = prediction.dataSync()[0];
    
    features.dispose();
    prediction.dispose();
    
    return {
      probability,
      direction: probability > 0.5 ? 'up' : 'down',
    };
  }
  
  private calculateRSI(candles: CandleData[]): number {
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < candles.length; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / (candles.length - 1);
    const avgLoss = losses / (candles.length - 1);
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }
}

// ============================================
// Factory function
// ============================================
export function createPredictionModel(config?: Partial<ModelConfig>): PricePredictionModel {
  return new PricePredictionModel(config);
}

export function createTrendClassifier(): TrendClassifier {
  return new TrendClassifier();
}
