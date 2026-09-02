import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Support large payload for GEDCOM and image data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy initialization helper for Google GenAI
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing. Configure it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Multi-Agent Gemini Chat Endpoint
// Resilient multi-tier fallback with gemini-3.7-flash as default high-capability model
async function generateContentWithFallback(
  ai: GoogleGenAI,
  candidateModels: string[],
  contents: any,
  config: any
): Promise<{ text: string; modelUsed: string }> {
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      const text = response.text || '';
      if (text) {
        return { text, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`Attempt with model "${model}" failed:`, err.message || err);
      lastError = err;
      // If thinkingConfig caused an issue on a fallback model, strip it on next tries
      if (config.thinkingConfig) {
        config = { ...config, thinkingConfig: undefined };
      }
    }
  }

  throw lastError || new Error('All model attempts failed');
}

app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { 
      messages, 
      message, 
      history, 
      agentRole = 'director', 
      modelMode = 'general', 
      contextData, 
      treeContext 
    } = req.body;

    const ai = getGenAI();

    // Model candidate chain based on mode
    let candidateModels: string[] = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
    let thinkingConfig: { thinkingLevel?: ThinkingLevel } | undefined = undefined;

    if (modelMode === 'high-thinking') {
      candidateModels = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
      thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    } else if (modelMode === 'low-latency') {
      candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-3.5-flash'];
    }

    // Role-specific System Instructions
    let roleInstruction = `You are an expert genealogical research intelligence agent operating within the Genealogical Intelligence OS.
Your objective is to adhere strictly to the Genealogical Proof Standard (GPS):
1. Reasoned conclusions based on reasonably exhaustive research.
2. Complete and accurate source citations.
3. Critical evidence correlation and conflict resolution.
4. Active falsification of unproven assumptions and namesake confusion.
Never state assumptions as facts. Explicitly label claims as [DOCUMENTED], [DERIVED], [INFERRED], or [HYPOTHESIS].`;

    if (agentRole === 'director') {
      roleInstruction += `\nROLE: Research Director. Formulate structured information-gain research plans, evaluate brick-walls, prioritize next collection searches, and identify evidence gaps.`;
    } else if (agentRole === 'falsifier' || agentRole === 'falsification') {
      roleInstruction += `\nROLE: Genealogical Falsification Agent. Actively critique and stress-test genealogical conclusions. Search for alternative explanations, identity conflations (namesake traps), chronological inconsistencies, and geographical impossibilities. Propose specific records that could disprove the current theory.`;
    } else if (agentRole === 'geneticist' || agentRole === 'dna') {
      roleInstruction += `\nROLE: Genetic Genealogist & DNA Correlation Agent. Analyze centiMorgan (cM) sharing, segment triangulation, Mendelian inheritance rules, pedigree collapse, and endogamy. Connect DNA evidence to documentary evidence.`;
    } else if (agentRole === 'paleographer') {
      roleInstruction += `\nROLE: Paleographer & Document Specialist. Transcribe and interpret historical scripts, 18th/19th century abbreviations, parish record terminology, legal phrasing, and Latin/archaic entries.`;
    } else if (agentRole === 'historian' || agentRole === 'context') {
      roleInstruction += `\nROLE: Historical Context & Migration Agent. Provide time-and-place context including historical events, epidemics, local statutes, transport routes, and community/FAN (Friends, Associates, Neighbors) networks.`;
    }

    const contextPayload = contextData || treeContext;
    if (contextPayload) {
      roleInstruction += `\n\nCURRENT TREE & EVIDENCE CONTEXT:\n${typeof contextPayload === 'string' ? contextPayload : JSON.stringify(contextPayload, null, 2)}`;
    }

    // Prepare contents array
    let contents: any[] = [];
    if (Array.isArray(messages) && messages.length > 0) {
      contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
    } else if (Array.isArray(history) && history.length > 0) {
      contents = [
        ...history,
        ...(message ? [{ role: 'user', parts: [{ text: message }] }] : []),
      ];
    } else if (message) {
      contents = [{ role: 'user', parts: [{ text: message }] }];
    } else {
      return res.status(400).json({ error: 'A message or messages array is required' });
    }

    const config: any = {
      systemInstruction: roleInstruction,
      temperature: modelMode === 'high-thinking' ? 0.7 : 0.4,
    };

    if (thinkingConfig) {
      config.thinkingConfig = thinkingConfig;
    }

    const { text: responseText, modelUsed } = await generateContentWithFallback(
      ai,
      candidateModels,
      contents,
      config
    );

    res.json({
      text: responseText,
      reply: responseText,
      modelUsed,
      thinkingEnabled: modelMode === 'high-thinking',
    });
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    const isQuota = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED');
    res.status(isQuota ? 429 : 500).json({
      error: isQuota 
        ? 'Gemini API free tier rate limit was reached. Please retry in a few seconds or configure a custom API key in Settings.'
        : error.message || 'Failed to process genealogical AI request',
      reply: isQuota
        ? 'The Gemini free tier rate limit was temporarily reached. Please retry your request in a moment.'
        : `Request could not be completed: ${error.message || 'Unknown error'}`,
      isQuota,
    });
  }
});

// Image Generation using gemini-3.1-flash-image with 1K, 2K, 4K resolution support
app.post('/api/gemini/generate-image', async (req, res) => {
  try {
    const { prompt, imageSize = '1K', aspectRatio = '1:1', historicalContext } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for image generation' });
    }

    const ai = getGenAI();

    // Enrich prompt with historical precision
    let fullPrompt = prompt;
    if (historicalContext) {
      fullPrompt = `Authentic historical depiction: ${prompt}. Period context: ${historicalContext}. Accurate period attire, atmospheric lighting, museum archival quality, high detail.`;
    }

    // Try gemini-3.1-flash-image, falling back to gemini-3.1-flash-lite-image if needed
    let response: any;
    let modelUsed = 'gemini-3.1-flash-image';

    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || '1:1',
            imageSize: imageSize || '1K',
          },
        },
      });
    } catch (primaryErr: any) {
      console.warn('gemini-3.1-flash-image encountered an error, falling back to gemini-3.1-flash-lite-image:', primaryErr.message);
      modelUsed = 'gemini-3.1-flash-lite-image';
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio || '1:1',
          },
        },
      });
    }

    let imageUrl: string | null = null;
    let descriptionText: string | null = null;

    if (response?.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mimeType};base64,${base64Data}`;
        } else if (part.text) {
          descriptionText = part.text;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: 'Model did not return image data',
        text: descriptionText,
      });
    }

    res.json({
      imageUrl,
      image: imageUrl,
      description: descriptionText || fullPrompt,
      size: imageSize,
      aspectRatio,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Gemini image generation error:', error);
    const isQuotaError = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED');
    
    // Provide a descriptive status code and message
    res.status(isQuotaError ? 429 : 500).json({
      error: isQuotaError
        ? 'Gemini Image Generation rate limit or free tier quota reached. Please wait a moment or select a custom key in Settings.'
        : error.message || 'Image generation failed',
      isQuotaError,
      details: error.toString(),
    });
  }
});

// Specialized Falsification & Proof Verification Endpoint
app.post('/api/gemini/falsify', async (req, res) => {
  try {
    const { claim, person, familyContext, existingSources } = req.body;
    const ai = getGenAI();

    const prompt = `Perform an adversarial genealogical falsification audit on this conclusion:
CLAIM TO FALSIFY: ${JSON.stringify(claim, null, 2)}
SUBJECT PERSON: ${JSON.stringify(person, null, 2)}
FAMILY CONTEXT: ${JSON.stringify(familyContext, null, 2)}
EXISTING SOURCES: ${JSON.stringify(existingSources, null, 2)}

Provide a rigorous proof analysis with:
1. Vulnerability Assessment (where the logic could break)
2. Alternative Hypotheses (e.g. unrecorded sibling, namesake cousin in adjacent parish)
3. Three concrete Falsification Tests (specific records or tests that would invalidate this claim)
4. Recommended Next Action to achieve Genealogical Proof Standard (GPS) compliance.`;

    const { text: responseText, modelUsed } = await generateContentWithFallback(
      ai,
      ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'],
      prompt,
      {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: 'You are the Chief Falsification Officer of the Genealogical Intelligence OS. Your duty is to prevent false lineages and challenge premature conclusions with rigorous historical evidence rules.',
      }
    );

    res.json({
      analysis: responseText,
      modelUsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Falsification error:', error);
    const isQuota = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED');
    res.status(isQuota ? 429 : 500).json({ 
      error: isQuota 
        ? 'Gemini rate limit reached. Please retry in a few moments.' 
        : error.message || 'Falsification audit failed' 
    });
  }
});

// Specialized Ancestor Simulation Generator
app.post('/api/gemini/simulate-ancestor', async (req, res) => {
  try {
    const { 
      person, 
      year, 
      fidelityLevel, 
      constraintLevel, 
      userPrompt, 
      location, 
      documentedEvents, 
      tree 
    } = req.body;
    const ai = getGenAI();

    const effectiveLevel = constraintLevel !== undefined ? constraintLevel : (fidelityLevel !== undefined ? fidelityLevel : 2);
    const targetYear = year || (person?.birthDate ? (parseInt(person.birthDate, 10) + 25) : 1845);
    const targetLoc = location || person?.birthPlace || 'Historical Locale';

    const prompt = `Generate an evidence-constrained Ancestor Historical Simulation:
PERSON: ${person?.firstName || 'Ancestor'} ${person?.lastName || ''} (${person?.birthDate || 'Unknown'} - ${person?.deathDate || 'Unknown'})
OCCUPATION: ${person?.occupation || 'Agricultural laborer / Homesteader'}
SIMULATION TARGET YEAR: ${targetYear}
LOCATION: ${targetLoc}
FIDELITY / CONSTRAINT LEVEL: ${effectiveLevel} (0=Evidence Replay, 1=Bounded Reconstruction, 2=Possible-World, 3=Contextual Experience, 4=Counterfactual, 5=Illustrative Narrative)
USER QUERY / RESEARCH SCENARIO: ${userPrompt || 'Simulate daily routines, agricultural chores, community interactions, and historical context during harvest season.'}
DIRECTLY DOCUMENTED EVENTS & CLAIMS: ${JSON.stringify(documentedEvents || person?.claims || [], null, 2)}

Requirements:
- Adhere strictly to the chosen fidelity level.
- Format the output into structured paragraphs where EVERY sentence is tagged with its epistemic status:
  - [DOCUMENTED]: Directly backed by archival record.
  - [DERIVED]: Mechanically calculated (e.g., age from birth date).
  - [INFERRED]: Probabilistically likely based on household/community patterns.
  - [CONTEXTUAL]: Sourced regional historical context of the period (weather, economic crisis, local industry).
  - [UNKNOWN]: Unresolved mystery or unrecorded aspect.
- Provide a summary of living conditions, daily occupation, and local community context.`;

    const { text: responseText, modelUsed } = await generateContentWithFallback(
      ai,
      ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'],
      prompt,
      {}
    );

    res.json({
      simulation: responseText,
      simulationText: responseText,
      modelUsed,
      fidelityLevel: effectiveLevel,
      constraintLevel: effectiveLevel,
      year: targetYear,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Simulation error:', error);
    const isQuota = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED');
    res.status(isQuota ? 429 : 500).json({ 
      error: isQuota 
        ? 'Gemini rate limit reached. Please retry in a few moments.' 
        : error.message || 'Simulation generation failed' 
    });
  }
});

// ----------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS
// ----------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Genealogical Intelligence OS server running on http://localhost:${PORT}`);
  });
}

startServer();
