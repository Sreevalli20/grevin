/**
 * AI Task Extraction Service
 * Integrates with Groq API for structured task extraction
 */

export interface ExtractedTaskFields {
  title?: string;
  description?: string;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort?: number;
  dependencies?: string[];
  tags?: string[];
  projectId?: string;
}

export interface ExtractionResult {
  success: boolean;
  data?: ExtractedTaskFields;
  error?: string;
  source: 'ai' | 'local_fallback';
}

class AIExtractionService {
  private apiBaseUrl: string = '';

  constructor() {
    // Use the secure serverless proxy endpoint
    // API key is server-side only (Vercel environment variable)
    this.apiBaseUrl = import.meta.env.VITE_AI_API_BASE_URL || '';
  }

  /**
   * Extract structured task fields from natural language input
   */
  async extractTask(input: string): Promise<ExtractionResult> {
    try {
      const response = await this.callGeminiAPI(input);
      return {
        success: true,
        data: response,
        source: 'ai',
      };
    } catch (error) {
      console.error('AI extraction failed, falling back to local parser:', error);
      return this.localFallbackExtraction(input);
    }
  }

  /**
   * Call Google Gemini API via secure serverless proxy
   * API key is server-side only, never exposed to browser
   */
  private async callGeminiAPI(input: string): Promise<ExtractedTaskFields> {
    // Always use the secure serverless proxy endpoint
    const endpoint = this.apiBaseUrl
      ? `${this.apiBaseUrl}/api/extract-task`
      : '/api/extract-task';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error('Invalid response from AI service');
    }

    return this.validateExtractedFields(data.data);
  }

  /**
   * Validate and sanitize extracted fields
   */
  private validateExtractedFields(fields: any): ExtractedTaskFields {
    const validPriorities = ['low', 'medium', 'high', 'critical'];

    return {
      title: typeof fields.title === 'string' ? fields.title.substring(0, 200) : undefined,
      description: typeof fields.description === 'string' ? fields.description.substring(0, 2000) : undefined,
      deadline: this.validateDate(fields.deadline),
      priority: validPriorities.includes(fields.priority) ? fields.priority : undefined,
      estimatedEffort: typeof fields.estimatedEffort === 'number' && fields.estimatedEffort > 0
        ? Math.min(fields.estimatedEffort, 365)
        : undefined,
      dependencies: Array.isArray(fields.dependencies)
        ? fields.dependencies.filter((d: any) => typeof d === 'string').slice(0, 10)
        : undefined,
      tags: Array.isArray(fields.tags)
        ? fields.tags.filter((t: any) => typeof t === 'string').slice(0, 10)
        : undefined,
      projectId: typeof fields.projectId === 'string' ? fields.projectId.substring(0, 50) : undefined,
    };
  }

  /**
   * Validate date format
   */
  private validateDate(date: any): string | undefined {
    if (typeof date !== 'string') return undefined;

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return undefined;

    // Format as YYYY-MM-DD
    return parsed.toISOString().split('T')[0];
  }

  /**
   * Local fallback extraction for offline operation
   * Uses deterministic regex patterns to extract basic fields
   */
  private localFallbackExtraction(input: string): ExtractionResult {
    const fields: ExtractedTaskFields = {};

    // Extract title (first sentence or first 100 chars)
    const firstSentence = input.split(/[.!?]/)[0];
    fields.title = firstSentence.trim().substring(0, 100) || input.substring(0, 100);

    // Extract deadline (YYYY-MM-DD or MM/DD/YYYY)
    const datePatterns = [
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(due|deadline|by)\s*(\d{4}-\d{2}-\d{2})/i,
    ];

    for (const pattern of datePatterns) {
      const match = input.match(pattern);
      if (match) {
        const dateStr = match[match.length - 1];
        const validated = this.validateDate(dateStr);
        if (validated) {
          fields.deadline = validated;
          break;
        }
      }
    }

    // Extract priority keywords
    const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      critical: 'critical',
      urgent: 'critical',
      emergency: 'critical',
      high: 'high',
      important: 'high',
      medium: 'medium',
      normal: 'medium',
      low: 'low',
      minor: 'low',
    };

    const lowerInput = input.toLowerCase();
    for (const [keyword, priority] of Object.entries(priorityMap)) {
      if (lowerInput.includes(keyword)) {
        fields.priority = priority;
        break;
      }
    }

    // Extract effort (days)
    const effortPatterns = [
      /(\d+)\s*days?/i,
      /(\d+)\s*d/i,
      /(\d+)\s*hours?/i,
    ];

    for (const pattern of effortPatterns) {
      const match = input.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        if (pattern.toString().includes('hour')) {
          fields.estimatedEffort = Math.ceil(value / 8); // Convert hours to days
        } else {
          fields.estimatedEffort = value;
        }
        break;
      }
    }

    // Extract task codes as dependencies (e.g., TSK-101, TSK-102)
    const depPattern = /([A-Z]{3}-\d{3})/g;
    const deps: string[] = [];
    let depMatch;
    while ((depMatch = depPattern.exec(input)) !== null) {
      deps.push(depMatch[1]);
    }
    if (deps.length > 0) {
      fields.dependencies = deps;
    }

    return {
      success: true,
      data: fields,
      source: 'local_fallback',
    };
  }

  /**
   * Check if AI service is configured
   * Returns true if the serverless proxy endpoint is available
   */
  isConfigured(): boolean {
    // AI service is considered configured if the proxy endpoint is available
    // The actual API key is server-side only
    return true;
  }
}

export const aiExtraction = new AIExtractionService();
