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
// Supports Thinking Level (HIGH for gemini-3.1-pro-preview), Low-latency (gemini-3.1-flash-lite), and General (gemini-3.5-flash)
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, agentRole, modelMode, contextData } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const ai = getGenAI();

    // Map model selection
    let modelName = 'gemini-3.5-flash';
    let thinkingConfig: { thinkingLevel?: ThinkingLevel } | undefined = undefined;

    if (modelMode === 'high-thinking') {
      modelName = 'gemini-3.1-pro-preview';
      thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    } else if (modelMode === 'low-latency') {
      modelName = 'gemini-3.1-flash-lite';
    } else {
      modelName = 'gemini-3.5-flash';
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
    } else if (agentRole === 'falsification') {
      roleInstruction += `\nROLE: Genealogical Falsification Agent. Actively critique and stress-test genealogical conclusions. Search for alternative explanations, identity conflations (namesake traps), chronological inconsistencies, and geographical impossibilities. Propose specific records that could disprove the current theory.`;
    } else if (agentRole === 'dna') {
      roleInstruction += `\nROLE: Genetic Genealogist & DNA Correlation Agent. Analyze centiMorgan (cM) sharing, segment triangulation, Mendelian inheritance rules, pedigree collapse, and endogamy. Connect DNA evidence to documentary evidence.`;
    } else if (agentRole === 'paleographer') {
      roleInstruction += `\nROLE: Paleographer & Document Specialist. Transcribe and interpret historical scripts, 18th/19th century abbreviations, parish record terminology, legal phrasing, and Latin/archaic entries.`;
    } else if (agentRole === 'context') {
      roleInstruction += `\nROLE: Historical Context & Migration Agent. Provide time-and-place context including historical events, epidemics, local statutes, transport routes, and community/FAN (Friends, Associates, Neighbors) networks.`;
    }

    if (contextData) {
      roleInstruction += `\n\nCURRENT TREE & EVIDENCE CONTEXT:\n${typeof contextData === 'string' ? contextData : JSON.stringify(contextData, null, 2)}`;
    }

    // Prepare contents
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const config: any = {
      systemInstruction: roleInstruction,
      temperature: modelMode === 'high-thinking' ? 0.7 : 0.4,
    };

    if (thinkingConfig) {
      config.thinkingConfig = thinkingConfig;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config,
    });

    const responseText = response.text || '';

    res.json({
      text: responseText,
      modelUsed: modelName,
      thinkingEnabled: modelMode === 'high-thinking',
    });
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process genealogical AI request',
      details: error.toString(),
    });
  }
});

// Image Generation using gemini-3-pro-image-preview with 1K, 2K, 4K affordance
app.post('/api/gemini/generate-image', async (req, res) => {
  try {
    const { prompt, imageSize = '1K', aspectRatio = '1:1', historicalContext } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for image generation' });
    }

    const ai = getGenAI();

    // Model name as specified in instructions
    const modelName = 'gemini-3-pro-image-preview';

    // Enrich prompt with historical precision
    let fullPrompt = prompt;
    if (historicalContext) {
      fullPrompt = `Authentic historical depiction: ${prompt}. Period context: ${historicalContext}. Accurate period attire, atmospheric lighting, museum archival quality, high detail.`;
    }

    const response = await ai.models.generateContent({
      model: modelName,
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

    let imageUrl: string | null = null;
    let descriptionText: string | null = null;

    if (response.candidates && response.candidates[0]?.content?.parts) {
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
      description: descriptionText || fullPrompt,
      size: imageSize,
      aspectRatio,
      modelUsed: modelName,
    });
  } catch (error: any) {
    console.error('Gemini image generation error:', error);
    res.status(500).json({
      error: error.message || 'Image generation failed',
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        systemInstruction: 'You are the Chief Falsification Officer of the Genealogical Intelligence OS. Your duty is to prevent false lineages and challenge premature conclusions with rigorous historical evidence rules.',
      },
    });

    res.json({
      analysis: response.text,
      modelUsed: 'gemini-3.1-pro-preview',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Falsification error:', error);
    res.status(500).json({ error: error.message || 'Falsification audit failed' });
  }
});

// Specialized Ancestor Simulation Generator
app.post('/api/gemini/simulate-ancestor', async (req, res) => {
  try {
    const { person, year, fidelityLevel, location, documentedEvents } = req.body;
    const ai = getGenAI();

    const prompt = `Generate an evidence-constrained Ancestor Historical Simulation:
PERSON: ${person.firstName} ${person.lastName} (${person.birthDate || 'Unknown'} - ${person.deathDate || 'Unknown'})
SIMULATION TARGET YEAR: ${year}
LOCATION: ${location || person.birthPlace || 'Historical Locale'}
FIDELITY LEVEL: ${fidelityLevel} (0=Evidence Replay, 1=Bounded Reconstruction, 2=Possible-World, 3=Contextual Experience, 4=Counterfactual, 5=Illustrative Narrative)
DIRECTLY DOCUMENTED EVENTS: ${JSON.stringify(documentedEvents, null, 2)}

Requirements:
- Adhere strictly to the chosen fidelity level.
- Format the output into structured paragraphs where EVERY sentence is tagged with its epistemic status:
  - [DOCUMENTED]: Directly backed by archival record.
  - [DERIVED]: Mechanically calculated (e.g., age from birth date).
  - [INFERRED]: Probabilistically likely based on household/community patterns.
  - [CONTEXTUAL]: Sourced regional historical context of the period (weather, economic crisis, local industry).
  - [UNKNOWN]: Unresolved mystery or unrecorded aspect.
- Provide a summary of living conditions, daily occupation, and local community context.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({
      simulationText: response.text,
      fidelityLevel,
      year,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Simulation error:', error);
    res.status(500).json({ error: error.message || 'Simulation generation failed' });
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
