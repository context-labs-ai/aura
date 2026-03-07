import { Type } from '@google/genai';

/**
 * Gemini responseSchema for building analysis mode.
 * Used with responseMimeType: 'application/json' in generateContent config.
 */
export const buildingAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Name of the building or business',
    },
    subtitle: {
      type: Type.STRING,
      description: 'Type of business or building category (e.g. "Coffee Shop", "Office Building")',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score from 0 to 1 for the analysis',
    },
    rating: {
      type: Type.NUMBER,
      description: 'Estimated rating out of 5 based on visible cues',
    },
    reviewSummary: {
      type: Type.STRING,
      description: 'Brief summary of what reviews might say based on visible quality',
    },
    openNow: {
      type: Type.BOOLEAN,
      description: 'Whether the business appears to be currently open based on visible cues',
    },
    hours: {
      type: Type.STRING,
      description: 'Estimated or visible operating hours',
    },
    footTrafficHypothesis: {
      type: Type.STRING,
      description: 'Hypothesis about foot traffic patterns based on location and type',
    },
    neighborhoodSummary: {
      type: Type.STRING,
      description: 'Brief description of the surrounding neighborhood context',
    },
    panels: {
      type: Type.ARRAY,
      description: 'Structured data panels for HUD display',
      items: {
        type: Type.OBJECT,
        properties: {
          label: {
            type: Type.STRING,
            description: 'Panel label',
          },
          value: {
            type: Type.STRING,
            description: 'Panel value',
          },
          icon: {
            type: Type.STRING,
            description: 'Optional emoji icon for the panel',
          },
          type: {
            type: Type.STRING,
            description: 'Panel display type: text, rating, list, or badge',
          },
        },
        required: ['label', 'value', 'type'],
      },
    },
  },
  required: ['title', 'subtitle', 'confidence', 'panels'],
} as const;

/**
 * Gemini responseSchema for product analysis mode.
 * Used with responseMimeType: 'application/json' in generateContent config.
 */
export const productAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Name or type of the product',
    },
    subtitle: {
      type: Type.STRING,
      description: 'Product category or brand',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score from 0 to 1 for the analysis',
    },
    composition: {
      type: Type.ARRAY,
      description: 'Key materials or ingredients in the product',
      items: {
        type: Type.STRING,
      },
    },
    sustainabilityScore: {
      type: Type.NUMBER,
      description: 'Estimated sustainability score from 0 to 10',
    },
    priceEstimate: {
      type: Type.STRING,
      description: 'Estimated price range for the product',
    },
    alternatives: {
      type: Type.ARRAY,
      description: 'Suggested alternative products',
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'Name of the alternative product',
          },
          reason: {
            type: Type.STRING,
            description: 'Why this is a good alternative',
          },
        },
        required: ['name', 'reason'],
      },
    },
    supplyChainOrigin: {
      type: Type.STRING,
      description: 'Estimated origin or supply chain information',
    },
    marginGuess: {
      type: Type.STRING,
      description: 'Estimated profit margin hypothesis',
    },
    panels: {
      type: Type.ARRAY,
      description: 'Structured data panels for HUD display',
      items: {
        type: Type.OBJECT,
        properties: {
          label: {
            type: Type.STRING,
            description: 'Panel label',
          },
          value: {
            type: Type.STRING,
            description: 'Panel value',
          },
          icon: {
            type: Type.STRING,
            description: 'Optional emoji icon for the panel',
          },
          type: {
            type: Type.STRING,
            description: 'Panel display type: text, rating, list, or badge',
          },
        },
        required: ['label', 'value', 'type'],
      },
    },
  },
  required: ['title', 'subtitle', 'confidence', 'panels'],
} as const;

/**
 * Gemini responseSchema for scene classification (auto-detect mode).
 * Used to determine whether the camera is looking at a building or product.
 */
export const sceneClassificationSchema = {
  type: Type.OBJECT,
  properties: {
    mode: {
      type: Type.STRING,
      description: 'Detected scene type: building, product, or unknown',
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score from 0 to 1 for the classification',
    },
    reasoning: {
      type: Type.STRING,
      description: 'Brief explanation of why this classification was chosen',
    },
  },
  required: ['mode', 'confidence', 'reasoning'],
} as const;
