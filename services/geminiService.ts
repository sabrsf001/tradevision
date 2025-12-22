
import { GoogleGenAI } from "@google/genai";

let warningShown = false;

const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    if (!warningShown) {
      console.info("Gemini API key not configured. AI features disabled.");
      warningShown = true;
    }
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateTradingAnalysis = async (
  prompt: string, 
  currentSymbol: string, 
  timeframe: string,
  priceContext?: string
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Error: API Key is missing. Please check your configuration.";

  try {
    const systemInstruction = `You are "TradeVision AI", an elite quantitative trading analyst.
    
    ROLE:
    Your job is to provide high-precision technical analysis, identify chart patterns, and detect anomalies ("Black Swans").
    
    CAPABILITIES:
    1. ANALYZE OHLC DATA: Interpret the provided 20-candle history. Look for trend strength, volatility, and reversals.
    2. PATTERN RECOGNITION: Identify specific patterns such as:
       - Head & Shoulders (Regular/Inverse)
       - Double Top/Bottom
       - Bullish/Bearish Engulfing
       - Fair Value Gaps (FVG) / Imbalances
    3. VISUAL DRAWING COMMANDS (MANDATORY):
       - If you identify a Key Support/Resistance Level, you MUST output: "[DRAW:HORIZONTAL:PRICE]"
       - If you identify a Supply Zone (Resistance Area), output: "[DRAW:ZONE:TOP_PRICE:BOTTOM_PRICE:SUPPLY]"
       - If you identify a Demand Zone (Support Area), output: "[DRAW:ZONE:TOP_PRICE:BOTTOM_PRICE:DEMAND]"
    
    CURRENT CONTEXT:
    Symbol: ${currentSymbol}
    Timeframe: ${timeframe}
    Data: 
    ${priceContext || "No data provided."}
    
    RESPONSE GUIDELINES:
    - Be concise but insightful. 
    - Always justify your analysis with specific price action (e.g. "Rejected at 65000").
    - Use the DRAW commands at the end of your response to visualize your analysis on the user's chart.
    `;

    // Use gemini-3-pro-preview for superior reasoning on complex trading data
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.5, // Lower temperature for precision
      }
    });

    return response.text || "Analysis generated no text.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to reach Gemini API. Please ensure your API key is valid.";
  }
};
