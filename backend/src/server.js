import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import fg from 'fast-glob';
import { parse } from 'csv-parse';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional Gemini AI insights
let GoogleGenerativeAI = null;
try {
  // Dynamically import to avoid hard dependency when not installed
  ({ GoogleGenerativeAI } = await import('@google/generative-ai'));
} catch (_) {
  // no-op if not installed
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Root of analysis folder (configurable via env ANALYSIS_ROOT)
// Default: ../../data relative to this file (backend/src/server.js -> district-explorer/data)
const ANALYSIS_ROOT = process.env.ANALYSIS_ROOT 
  ? path.resolve(process.env.ANALYSIS_ROOT)
  : path.resolve(__dirname, '../../data');

// Utility: load CSV as array of objects
async function loadCsv(filePath) {
  return new Promise((resolve, reject) => {
    const records = [];
    fs.createReadStream(filePath)
      .pipe(parse({
        columns: (header) => header.map((h) => (h ?? '').toString().trim()),
        skip_empty_lines: true,
        bom: true,
        relax_column_count: true,
      }))
      .on('data', (row) => records.push(row))
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

// Index files per sector
async function discoverSectorFiles() {
  const sectors = ['agriculture', 'education', 'health', 'infra', 'irrigation', 'social'];
  const posixRoot = ANALYSIS_ROOT.replace(/\\/g, '/');
  const bySector = Object.fromEntries(sectors.map((s) => [s, []]));
  for (const s of sectors) {
    const pattern = `${posixRoot}/${s}/**/*.csv`;
    const files = await fg(pattern, { dot: false, onlyFiles: true, unique: true, caseSensitiveMatch: false });
    bySector[s] = files;
  }
  // Basic log for diagnostics
  for (const [s, files] of Object.entries(bySector)) {
    console.log(`[index] ${s}: ${files.length} csv files`);
  }
  return bySector;
}

// In-memory lightweight index: district -> village -> sector -> rows
let cache = { ready: false, districts: {}, bySectorFiles: {}, mapping: null };

function normalizeKey(s) {
  return (s || '').toString().trim().toLowerCase();
}

function getFieldByAliases(row, aliases) {
  // Build a lookup that tolerates casing and punctuation
  const lookup = new Map();
  for (const [k, v] of Object.entries(row)) {
    const trimmed = (k ?? '').toString().trim();
    const canon = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!lookup.has(trimmed)) lookup.set(trimmed, v);
    if (!lookup.has(canon)) lookup.set(canon, v);
  }
  for (const a of aliases) {
    const exact = lookup.get(a);
    if (exact !== undefined && exact !== null && `${exact}`.trim() !== '') return `${exact}`.trim();
    const canonA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
    const canonVal = lookup.get(canonA);
    if (canonVal !== undefined && canonVal !== null && `${canonVal}`.trim() !== '') return `${canonVal}`.trim();
  }
  return '';
}

function getDistrictField(row) {
  return (
    getFieldByAliases(row, [
      'District.Name',
      'District',
      'district',
      'DISTRICT',
      'District Name',
      'DISTRICT NAME',
      'Dist_Name',
      'DISTT_NAME',
    ]) || ''
  );
}

function getVillageField(row) {
  return (
    getFieldByAliases(row, [
      'Village.Name',
      'Village',
      'VILLAGE',
      'Village Name',
      'Village_Name',
      'Name of Village',
      'NAME OF VILLAGE',
    ]) || ''
  );
}

// Load Indexing mapping file to transform raw headers into friendly names
async function loadIndexingMapping() {
  const mappingPath = path.join(ANALYSIS_ROOT, 'DCHB_Village_Release_0600 v1 - Indexing.csv');
  if (!fs.existsSync(mappingPath)) {
    console.warn(`[mapping] Indexing file not found at ${mappingPath}`);
    return { byOriginal: new Map(), byFriendly: new Map(), boolHints: new Set(), duplicates: new Map() };
  }
  const rows = await loadCsv(mappingPath);
  const byOriginal = new Map();
  const byFriendly = new Map();
  const boolHints = new Set();
  const duplicates = new Map();
  for (const r of rows) {
    const original = (r['Label'] || '').toString().trim();
    const newLabel = (r['New Label'] || '').toString().trim();
    const status = (r['Status'] || '').toString().trim();
    const desc = (r['Description'] || '').toString().trim();
    if (!original) continue;
    byOriginal.set(original, { original, newLabel, status, desc });
    if (status && status.toLowerCase() !== 'drop' && newLabel) {
      if (!byFriendly.has(newLabel)) byFriendly.set(newLabel, []);
      byFriendly.get(newLabel).push(original);
    }
    if (/all values\s*'?.?1'?.*represent\s*available/i.test(desc)) {
      boolHints.add(original);
    }
    // Track duplicate friendly labels like generic "Distance"
    if (newLabel) {
      duplicates.set(newLabel, (duplicates.get(newLabel) || 0) + 1);
    }
  }
  console.log(`[mapping] loaded: ${rows.length} rows, friendly labels: ${byFriendly.size}`);
  return { byOriginal, byFriendly, boolHints, duplicates };
}

// Create a friendly key; when friendly label is generic (e.g., Distance), append context from original label
function friendlyKeyFor(original, mapping, seenCounts) {
  const entry = mapping.byOriginal.get(original);
  if (!entry) return original;
  const base = entry.newLabel || original;
  // If the friendly label is used by many different originals, disambiguate using context snippet
  const isGeneric = (mapping.duplicates.get(base) || 0) > 5 || /distance|numbers|status/i.test(base);
  if (!isGeneric) return base;
  // Extract a short context from the original label (before first parenthesis)
  const context = original.split('(')[0].replace(/\s+/g, ' ').trim();
  const name = `${base} — ${context}`;
  // Ensure stable uniqueness if repeated
  const n = (seenCounts.get(name) || 0) + 1;
  seenCounts.set(name, n);
  return n > 1 ? `${name} #${n}` : name;
}

// Transform raw rows into friendly summarized fields
function prettyNameFromKey(key) {
  const k = (key || '').toString().trim();
  if (!k) return '';
  // Replace underscores/dots with spaces, collapse multiple spaces, Title Case words
  const cleaned = k.replace(/[_.]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function buildFriendlySummary(rows, mapping) {
  if (!rows || !rows.length) return [];
  const acc = new Map(); // friendlyName -> { type, value, originals: Set }
  const seenCounts = new Map();
  for (const row of rows) {
    for (const [origKey, rawVal] of Object.entries(row)) {
      if (!origKey || !origKey.toString().trim()) continue; // skip empty keys
      const entry = mapping.byOriginal.get(origKey);
      const status = entry?.status;
      // Only skip if explicitly marked drop in mapping
      if (status && status.toLowerCase() === 'drop') continue;

      // Determine friendly label: from mapping when available, else prettify the key
      const friendly = entry ? friendlyKeyFor(origKey, mapping, seenCounts) : prettyNameFromKey(origKey);
      const valStr = (rawVal ?? '').toString().trim();
      if (!acc.has(friendly)) acc.set(friendly, { type: 'text', value: '', originals: new Set() });
      const node = acc.get(friendly);
      node.originals.add(origKey);

      // Decide type and aggregation
      // If numeric, sum; if boolean-ish (0/1), OR; else keep first non-empty text
      const num = Number(valStr);
      const isNumeric = !Number.isNaN(num) && valStr !== '';
      const isBoolish = mapping.boolHints.has(origKey) || /\bstatus\b/i.test(origKey) || /\bA\(1\)\/NA\(2\)/i.test(origKey) || /^(0|1|yes|no)$/i.test(valStr);

      if (isNumeric) {
        // Treat as boolean only when mapping or header clearly indicates boolean/status
        if (isBoolish) {
          if (node.type !== 'boolean') {
            node.type = 'boolean';
            node.value = false;
          }
          node.value = Boolean(node.value) || num > 0;
        } else {
          if (node.type !== 'number') {
            node.type = 'number';
            node.value = 0;
          }
          node.value = Number(node.value) + num;
        }
      } else if (valStr) {
        // Keep the shortest non-empty descriptive text or the first one
        if (!node.value || (node.type === 'text' && valStr.length < String(node.value).length)) {
          node.type = 'text';
          node.value = valStr;
        }
      }
    }
  }

  // Convert map to sorted array: booleans first, then numbers desc, then text
  const items = Array.from(acc.entries()).map(([name, v]) => ({ name, ...v, originals: Array.from(v.originals) }));
  items.sort((a, b) => {
    const rank = (t) => (t === 'boolean' ? 0 : t === 'number' ? 1 : 2);
    const ra = rank(a.type);
    const rb = rank(b.type);
    if (ra !== rb) return ra - rb;
    if (a.type === 'number' && b.type === 'number') return Number(b.value) - Number(a.value);
    return a.name.localeCompare(b.name);
  });
  return items;
}

// Optional: call Gemini with a structured prompt to generate insights
async function generateAiInsights({ district, village, sector, facts, modelName }) {
  const apiKey = process.env.GOOGLE_API_KEY;
  console.log(`[ai] Attempting generation for ${sector}: apiKey=${apiKey ? 'present' : 'missing'}, GoogleGenerativeAI=${GoogleGenerativeAI ? 'loaded' : 'not loaded'}`);
  
  if (!apiKey || !GoogleGenerativeAI) {
    console.log(`[ai] Skipping generation: API key ${apiKey ? 'present' : 'missing'}, GoogleGenerativeAI ${GoogleGenerativeAI ? 'loaded' : 'not loaded'}`);
    return null; // Not configured
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName || process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
    const topFacts = facts.slice(0, 20).map((f) => {
      let v = f.value;
      if (f.type === 'boolean') v = v ? 'Available' : 'Not Available';
      return `- ${f.name}: ${v}`;
    }).join('\n');
    const prompt = `You are a data analyst for rural development. Using the following key facts for the village "${village}" in district "${district}" (sector: ${sector}), write a brief, practical insight in 5-8 bullet points: strengths, gaps/risks, and 2-3 actionable suggestions. Avoid jargon and keep it specific to the facts.\n\nKey facts:\n${topFacts}`;
    console.log(`[ai] Calling Gemini for ${sector} with ${topFacts.split('\n').length} facts`);
    const result = await model.generateContent(prompt);
    const text = result?.response?.text?.() || '';
    console.log(`[ai] Generated ${text.length} chars for ${sector}`);
    return text.trim() || null;
  } catch (e) {
    console.warn(`[ai] generation failed for ${sector}:`, e.message || e);
    // Return specific error message for quota exceeded
    if (e.message && e.message.includes('quota')) {
      return '⚠️ AI insights temporarily unavailable due to API quota limits. The key facts above provide comprehensive village data for analysis.';
    }
    return null;
  }
}

async function buildIndex() {
  const bySector = await discoverSectorFiles();
  const mapping = await loadIndexingMapping();
  const districts = {};

  // helper to upsert
  const upsert = (dName, vName, sector, row) => {
    const dKey = normalizeKey(dName);
    const vKey = normalizeKey(vName);
    if (!dKey || !vKey) return;
    if (!districts[dKey]) districts[dKey] = { name: dName, villages: {} };
    if (!districts[dKey].villages[vKey]) districts[dKey].villages[vKey] = { name: vName, sectors: {} };
    if (!districts[dKey].villages[vKey].sectors[sector]) districts[dKey].villages[vKey].sectors[sector] = [];
    districts[dKey].villages[vKey].sectors[sector].push(row);
  };

  for (const [sector, files] of Object.entries(bySector)) {
    for (const file of files) {
      const rows = await loadCsv(file);
      if (!rows.length) continue;
      for (const row of rows) {
        const d = getDistrictField(row);
        const v = getVillageField(row);
        upsert(d, v, sector, row);
      }
    }
  }

  cache = { ready: true, districts, bySectorFiles: bySector, mapping };
  const dCount = Object.keys(districts).length;
  console.log(`[index] root=${ANALYSIS_ROOT}`);
  console.log(`[index] built: ${dCount} districts`);
}

// Build cache at startup
buildIndex().catch((e) => {
  console.error('Failed to build index:', e);
});

// Optional: reload index on demand
app.post('/api/reload', async (req, res) => {
  try {
    cache = { ready: false, districts: {}, bySectorFiles: {} };
    await buildIndex();
    res.json({ ok: true });
  } catch (e) {
    console.error('Reload failed', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// API: debug info
app.get('/api/debug', (req, res) => {
  if (!cache.ready) return res.status(503).json({ message: 'Index building' });
  const districtNames = Object.values(cache.districts).slice(0, 5).map((d) => d.name);
  const sectors = Object.fromEntries(Object.entries(cache.bySectorFiles).map(([k, v]) => [k, v.length]));
  res.json({ root: ANALYSIS_ROOT, sectors, districts: districtNames, districtsCount: Object.keys(cache.districts).length, mappingLoaded: Boolean(cache.mapping) });
});

// API: list districts
app.get('/api/districts', (req, res) => {
  if (!cache.ready) return res.status(503).json({ message: 'Index building' });
  const list = Object.values(cache.districts).map((d) => ({ key: normalizeKey(d.name), name: d.name }));
  list.sort((a, b) => a.name.localeCompare(b.name));
  res.json(list);
});

// API: list villages in a district
app.get('/api/districts/:district/villages', (req, res) => {
  if (!cache.ready) return res.status(503).json({ message: 'Index building' });
  const dKey = normalizeKey(req.params.district);
  const d = cache.districts[dKey];
  if (!d) return res.status(404).json({ message: 'District not found' });
  const villages = Object.values(d.villages).map((v) => ({ key: normalizeKey(v.name), name: v.name }));
  villages.sort((a, b) => a.name.localeCompare(b.name));
  res.json(villages);
});

// API: get village insights (all sectors)
app.get('/api/districts/:district/villages/:village', (req, res) => {
  if (!cache.ready) return res.status(503).json({ message: 'Index building' });
  const dKey = normalizeKey(req.params.district);
  const vKey = normalizeKey(req.params.village);
  const d = cache.districts[dKey];
  if (!d) return res.status(404).json({ message: 'District not found' });
  const v = d.villages[vKey];
  if (!v) return res.status(404).json({ message: 'Village not found' });
  res.json({ district: d.name, village: v.name, sectors: v.sectors });
});

// API: schema (columns) per sector for a village
app.get('/api/districts/:district/villages/:village/schema', (req, res) => {
  if (!cache.ready) return res.status(503).json({ message: 'Index building' });
  const dKey = normalizeKey(req.params.district);
  const vKey = normalizeKey(req.params.village);
  const d = cache.districts[dKey];
  if (!d) return res.status(404).json({ message: 'District not found' });
  const v = d.villages[vKey];
  if (!v) return res.status(404).json({ message: 'Village not found' });
  const schema = Object.fromEntries(
    Object.entries(v.sectors).map(([sector, rows]) => [
      sector,
      rows.length ? Object.keys(rows[0]) : []
    ])
  );
  res.json(schema);
});

// API: friendly summaries and optional AI insights per sector for a village
app.get('/api/districts/:district/villages/:village/insights', async (req, res) => {
  try {
    if (!cache.ready) return res.status(503).json({ message: 'Index building' });
    const dKey = normalizeKey(req.params.district);
    const vKey = normalizeKey(req.params.village);
    const d = cache.districts[dKey];
    if (!d) return res.status(404).json({ message: 'District not found' });
    const v = d.villages[vKey];
    if (!v) return res.status(404).json({ message: 'Village not found' });
    const mapping = cache.mapping || { byOriginal: new Map(), byFriendly: new Map(), boolHints: new Set(), duplicates: new Map() };
    const sectors = {};
    for (const [sector, rows] of Object.entries(v.sectors || {})) {
      const facts = buildFriendlySummary(rows, mapping);
      // Generate AI insights (optional) - COMMENTED OUT FOR PERFORMANCE
      // const ai = await generateAiInsights({ district: d.name, village: v.name, sector, facts });
      const ai = null; // Temporarily disabled for performance
      sectors[sector] = { facts, ai };
    }
    res.json({ district: d.name, village: v.name, sectors });
  } catch (e) {
    console.error('Insights error', e);
    res.status(500).json({ message: 'Failed to build insights', error: String(e) });
  }
});

// API: get enhanced education analytics for a village
app.get('/api/districts/:district/villages/:village/education-analytics', (req, res) => {
  try {
    if (!cache.ready) return res.status(503).json({ message: 'Index building' });
    const dKey = normalizeKey(req.params.district);
    const vKey = normalizeKey(req.params.village);
    const d = cache.districts[dKey];
    if (!d) return res.status(404).json({ message: 'District not found' });
    const v = d.villages[vKey];
    if (!v) return res.status(404).json({ message: 'Village not found' });
    
    const eduData = v.sectors.education;
    if (!eduData || !eduData.length) {
      return res.json({ message: 'No education data available' });
    }
    
    // Process education data for visualization
    const row = eduData[0]; // Take first row (should be unique per village)
    
    // Demographics
    const demographics = {
      totalPopulation: Number(row['Total.Population.of.Village'] || 0),
      malePopulation: Number(row['Total.Male.Population.of.Village'] || 0),
      femalePopulation: Number(row['Total.Female.Population.of.Village'] || 0),
      households: Number(row['Total.Households'] || 0),
      populationCategory: Number(row['Total.Population.of.Village'] || 0) < 1000 ? 'Small' : 
                         Number(row['Total.Population.of.Village'] || 0) <= 2500 ? 'Medium' : 'Large'
    };
    
    // School Infrastructure
    const schools = {
      prePrimary: Number(row['Total.Pre...Primary.School'] || row['Total.Pre.-.Primary.School'] || 0),
      middle: Number(row['Total.Middle.Schools'] || 0),
      secondary: Number(row['Total.Secondary.Schools'] || 0),
      seniorSecondary: Number(row['Total.Senior.Secondary.Schools'] || 0),
      artsScience: Number(row['Total.Arts.and.Science.Degree.College'] || 0),
      engineering: Number(row['Total.Engineering.College'] || 0),
      medicine: Number(row['Total.Medicine.College'] || 0),
      management: Number(row['Total.Management.Institute'] || 0),
      vocational: Number(row['Total.Vocational.Training.School.ITI'] || row['Total.Vocational.Training.School/ITI'] || 0),
      nonFormal: Number(row['Total.Non.Formal.Training.Centre..Status.A.1..NA.2..'] || row['Total.Non.Formal.Training.Centre.(Status.A(1)/NA(2))'] || 0),
      disabled: Number(row['Total.School.For.Disabled'] || 0)
    };
    
    // Accessibility (distances in km - 0 means available in village)
    const accessibility = {
      prePrimary: Number(row['Distance'] || 0),
      middle: Number(row['Distance.1'] || 0),
      secondary: Number(row['Distance.2'] || 0),
      seniorSecondary: Number(row['Distance.3'] || 0),
      artsScience: Number(row['Distance.4'] || 0),
      engineering: Number(row['Distance.5'] || 0),
      medicine: Number(row['Distance.6'] || 0),
      management: Number(row['Distance.7'] || 0),
      vocational: Number(row['Distance.8'] || 0),
      disabled: Number(row['Distance.9'] || 0),
      nonFormal: Number(row['Distance10'] || 0)
    };
    
    // Calculate education metrics
    const totalSchools = Object.values(schools).reduce((sum, count) => sum + count, 0);
    const basicEducationSchools = schools.prePrimary + schools.middle + schools.secondary + schools.seniorSecondary;
    const higherEducationInstitutes = schools.artsScience + schools.engineering + schools.medicine + schools.management;
    const specializedTraining = schools.vocational + schools.nonFormal + schools.disabled;
    
    // Calculate education coverage
    const schoolsInVillage = Object.values(schools).filter(count => count > 0).length;
    const facilitiesInVillage = Object.values(accessibility).filter(dist => dist === 0).length;
    const avgDistanceToFacilities = Object.values(accessibility).filter(dist => dist > 0).reduce((sum, dist) => sum + dist, 0) / Object.values(accessibility).filter(dist => dist > 0).length || 0;
    
    const metrics = {
      totalSchools,
      basicEducationSchools,
      higherEducationInstitutes,
      specializedTraining,
      schoolsPerThousand: (totalSchools / demographics.totalPopulation) * 1000,
      educationCoverageRatio: (facilitiesInVillage / Object.keys(accessibility).length) * 100,
      avgDistanceToFacilities: Math.round(avgDistanceToFacilities * 10) / 10,
      clusters: Number(row['Clusters'] || 0)
    };
    
    res.json({
      village: v.name,
      district: d.name,
      demographics,
      schools,
      accessibility,
      metrics
    });
  } catch (e) {
    console.error('Education analytics error', e);
    res.status(500).json({ message: 'Failed to process education data', error: String(e) });
  }
});

// API: get enhanced agriculture analytics for a village
app.get('/api/districts/:district/villages/:village/agriculture-analytics', (req, res) => {
  try {
    if (!cache.ready) return res.status(503).json({ message: 'Index building' });
    const dKey = normalizeKey(req.params.district);
    const vKey = normalizeKey(req.params.village);
    const d = cache.districts[dKey];
    if (!d) return res.status(404).json({ message: 'District not found' });
    const v = d.villages[vKey];
    if (!v) return res.status(404).json({ message: 'Village not found' });
    
    const agriData = v.sectors.agriculture;
    if (!agriData || !agriData.length) {
      return res.json({ message: 'No agriculture data available' });
    }
    
    // Process agriculture data for visualization
    const row = agriData[0]; // Take first row (should be unique per village)
    
    // Demographics
    const demographics = {
      totalPopulation: Number(row['Total.Population.of.Village'] || 0),
      malePopulation: Number(row['Total.Male.Population.of.Village'] || 0),
      femalePopulation: Number(row['Total.Female.Population.of.Village'] || 0),
      households: Number(row['Total.Households'] || 0),
      populationCategory: Number(row['Total.Population.of.Village'] || 0) < 1000 ? 'Small' : 
                         Number(row['Total.Population.of.Village'] || 0) <= 2500 ? 'Medium' : 'Large'
    };
    
    // Land Usage (in hectares)
    const landUsage = {
      totalArea: Number(row['Total.Geographical.Area.(in.Hectares)'] || 0),
      forestArea: Number(row['Forest.Area.(in.Hectares)'] || 0),
      nonAgriculturalArea: Number(row['Area.under.Non-Agricultural.Uses.(in.Hectares)'] || 0),
      barrenLand: Number(row['Barren.&.Un-cultivable.Land.Area.(in.Hectares)'] || 0),
      grazingLand: Number(row['Permanent.Pastures.and.Other.Grazing.Land.Area.(in.Hectares)'] || 0),
      treeCropsArea: Number(row['Land.Under.Miscellaneous.Tree.Crops.etc..Area.(in.Hectares)'] || 0),
      culturableWasteLand: Number(row['Culturable.Waste.Land.Area.(in.Hectares)'] || 0),
      fallowsLand: Number(row['Fallows.Land.other.than.Current.Fallows.Area.(in.Hectares)'] || 0),
      currentFallows: Number(row['Current.Fallows.Area.(in.Hectares)'] || 0)
    };
    
    // Calculate agricultural area
    const agriculturalArea = landUsage.totalArea - landUsage.forestArea - landUsage.nonAgriculturalArea - landUsage.barrenLand;
    landUsage.agriculturalArea = Math.max(0, agriculturalArea);
    
    // Crop Availability
    const crops = {
      wheat: Boolean(Number(row['Wheat'] || 0)),
      rice: Boolean(Number(row['Rice'] || 0)),
      mustard: Boolean(Number(row['Musturd'] || 0)),
      others: Boolean(Number(row['Others'] || 0))
    };
    
    // Land efficiency metrics
    const metrics = {
      populationDensity: demographics.totalPopulation / landUsage.totalArea,
      agriculturalRatio: (landUsage.agriculturalArea / landUsage.totalArea) * 100,
      wasteRatio: ((landUsage.barrenLand + landUsage.culturableWasteLand + landUsage.fallowsLand) / landUsage.totalArea) * 100,
      cropDiversity: Object.values(crops).filter(Boolean).length,
      clusters: Number(row['Clusters'] || 0)
    };
    
    res.json({
      village: v.name,
      district: d.name,
      demographics,
      landUsage,
      crops,
      metrics
    });
  } catch (e) {
    console.error('Agriculture analytics error', e);
    res.status(500).json({ message: 'Failed to process agriculture data', error: String(e) });
  }
});

app.get('/api/districts/:district/villages/:village/health-analytics', (req, res) => {
  try {
    if (!cache.ready) return res.status(503).json({ message: 'Index building' });
    const dKey = normalizeKey(req.params.district);
    const vKey = normalizeKey(req.params.village);
    const d = cache.districts[dKey];
    if (!d) return res.status(404).json({ message: 'District not found' });
    const v = d.villages[vKey];
    if (!v) return res.status(404).json({ message: 'Village not found' });
    
    const healthData = v.sectors.health;
    if (!healthData || !healthData.length) {
      return res.json({ message: 'No health data available' });
    }
    
    // Process health data for visualization
    const row = healthData[0]; // Take first row (should be unique per village)
    
    // Demographics
    const demographics = {
      totalPopulation: Number(row['Total.Population.of.Village'] || 0),
      malePopulation: Number(row['Total.Male.Population.of.Village'] || 0),
      femalePopulation: Number(row['Total.Female.Population.of.Village'] || 0),
      households: Number(row['Total.Households'] || 0),
      populationCategory: Number(row['Total.Population.of.Village'] || 0) < 1000 ? 'Small' : 
                         Number(row['Total.Population.of.Village'] || 0) <= 2500 ? 'Medium' : 'Large'
    };
    
    // Healthcare Facilities
    const facilities = {
      communityHealthCentre: Number(row['Community.Health.Centre..Numbers.'] || 0),
      primaryHealthCentre: Number(row['Primary.Health.Centre..Numbers.'] || 0),
      primaryHealthSubCentre: Number(row['Primary.Heallth.Sub.Centre..Numbers.'] || 0),
      maternityChildWelfare: Number(row['Maternity.And.Child.Welfare.Centre..Numbers.'] || 0),
      tbClinic: Number(row['TB.Clinic..Numbers.'] || 0),
      hospitalAllopathic: Number(row['Hospital.Allopathic..Numbers.'] || 0),
      hospitalAlternative: Number(row['Hospiltal.Alternative.Medicine..Numbers.'] || 0),
      dispensary: Number(row['Dispensary..Numbers.'] || 0),
      veterinaryHospital: Number(row['Veterinary.Hospital..Numbers.'] || 0),
      mobileHealthClinic: Number(row['Mobile.Health.Clinic..Numbers.'] || 0),
      familyWelfareCentre: Number(row['Family.Welfare.Centre..Numbers.'] || 0)
    };
    
    // Doctor Staffing
    const doctorStaffing = {
      chcDoctorsTotal: Number(row['Total.Positions..Doctors...Support.'] || 0),
      chcDoctorsRequired: Number(row['Total.Required.Strength..Doctors...Support.'] || 0),
      phcDoctorsTotal: Number(row['Primary.Health.Centre.Doctors.Total.Strength..Numbers.'] || 0),
      phcDoctorsInPosition: Number(row['Primary.Health.Centre.Doctors.In.Position..Numbers.'] || 0),
      subCentreDoctorsTotal: Number(row['Primary.Heallth.Sub.Centre.Doctors.Total.Strength..Numbers.'] || 0),
      subCentreDoctorsInPosition: Number(row['Primary.Heallth.Sub.Centre.Doctors.In.Position..Numbers.'] || 0),
      hospitalDoctorsTotal: Number(row['Hospital.Allopathic.Doctors.Total.Strength..Numbers.'] || 0),
      hospitalDoctorsInPosition: Number(row['Hospital.Allopathic.Doctors.In.Position..Numbers.'] || 0),
      dispensaryDoctorsTotal: Number(row['Dispensary.Doctors.Total.Strength..Numbers.'] || 0),
      dispensaryDoctorsInPosition: Number(row['Dispensary.Doctors.In.Position..Numbers.'] || 0)
    };
    
    // Accessibility (distances)
    const accessibility = {
      chcDistance: row['Distance'] || 'In Village',
      phcDistance: row['Distance.1'] || 'In Village',
      subCentreDistance: row['Distance.2'] || 'In Village',
      maternityDistance: row['Distance.3'] || 'In Village',
      tbClinicDistance: row['Distance.4'] || 'In Village',
      hospitalDistance: row['Distance.5'] || 'In Village',
      alternativeDistance: row['Distance.6'] || 'In Village',
      dispensaryDistance: row['Distance.7'] || 'In Village',
      veterinaryDistance: row['Distance.8'] || 'In Village',
      mobileClinicDistance: row['Distance.9'] || 'In Village',
      familyWelfareDistance: row['Distance.10'] || 'In Village'
    };
    
    // Calculate metrics
    const totalFacilities = Object.values(facilities).reduce((sum, count) => sum + count, 0);
    const totalDoctorsRequired = Object.values(doctorStaffing).filter((_, i) => i % 2 === 0).reduce((sum, count) => sum + count, 0);
    const totalDoctorsInPosition = Object.values(doctorStaffing).filter((_, i) => i % 2 === 1).reduce((sum, count) => sum + count, 0);
    const staffingRatio = totalDoctorsRequired > 0 ? Math.round((totalDoctorsInPosition / totalDoctorsRequired) * 100) : 0;
    
    const metrics = {
      totalFacilities,
      totalDoctorsRequired,
      totalDoctorsInPosition,
      staffingRatio,
      facilitiesPerThousand: demographics.totalPopulation > 0 ? ((totalFacilities / demographics.totalPopulation) * 1000).toFixed(2) : 0,
      clusters: Number(row['Clusters'] || 0)
    };
    
    res.json({
      village: v.name,
      district: d.name,
      demographics,
      facilities,
      doctorStaffing,
      accessibility,
      metrics
    });
  } catch (e) {
    console.error('Health analytics error', e);
    res.status(500).json({ message: 'Failed to process health data', error: String(e) });
  }
});

// Infrastructure analytics endpoint
app.get('/api/districts/:district/villages/:village/infrastructure-analytics', (req, res) => {
  try {
    if (!cache.ready) return res.status(503).json({ message: 'Index building' });
    const dKey = normalizeKey(req.params.district);
    const vKey = normalizeKey(req.params.village);
    const d = cache.districts[dKey];
    if (!d) return res.status(404).json({ message: 'District not found' });
    const v = d.villages[vKey];
    if (!v) return res.status(404).json({ message: 'Village not found' });
    
    const infraData = v.sectors.infra;
    if (!infraData || !infraData.length) {
      return res.json({ message: 'No infrastructure data available' });
    }
    
    console.log(`Processing infrastructure analytics for ${req.params.district}/${req.params.village}`);
    
    // Process infrastructure data for visualization
    const row = infraData[0]; // Take first row (should be unique per village)
    
    // Demographics
    const demographics = {
      totalPopulation: Number(row['Total.Population.of.Village'] || 0),
      totalHouseholds: Number(row['Total.Households'] || 0),
      geographicalArea: Number(row['Total.Geographical.Area.(in.Hectares)'] || 0),
      populationDensity: Math.round((Number(row['Total.Population.of.Village'] || 0) / Number(row['Total.Geographical.Area.(in.Hectares)'] || 1)) * 100) / 100
    };
    
    // Water & Sanitation Infrastructure
    const waterSanitation = {
      tapWaterTreated: Boolean(Number(row['Tap.Water-Treated'] || 0)),
      closedDrainage: Boolean(Number(row['Closed.Drainage'] || 0)),
      openDrainage: Boolean(Number(row['Open.Drainage'] || 0)),
      waterTreatmentPlants: Boolean(Number(row['Water.Treatment.-.Sewar.Plants'] || 0)),
      sanitationCampaign: Boolean(Number(row['Total.Sanitation.Campaign.(TSC)'] || 0)),
      communityToilet: Boolean(Number(row['Community.Toilet.Complex'] || 0)),
      wasteDisposal: Boolean(Number(row['Community.waste.disposal.system.after.house.to.house.collection'] || 0)),
      biogas: Boolean(Number(row['Community.Bio-gas.or.recycle.of.waste.for.production.use'] || 0)),
      garbageOnRoad: Boolean(Number(row['No.System.(Garbage.on.road/street)'] || 0))
    };
    
    // Communication Infrastructure
    const communication = {
      postOffice: Boolean(Number(row['Post.Office.or.Sub.Post.Office'] || 0)),
      telephone: Boolean(Number(row['Telephone'] || 0)),
      pco: Boolean(Number(row['PCO'] || 0)),
      internetCafe: Boolean(Number(row['Internet.Cafes./.Common.Service.Centre.(CSC)'] || 0)),
      courier: Boolean(Number(row['Private.Courier.Facility'] || 0))
    };
    
    // Transportation Infrastructure
    const transportation = {
      publicBus: Boolean(Number(row['Public.Bus.Service'] || 0)),
      privateBus: Boolean(Number(row['Private.Bus.Service.(Status.A(1)/NA(2))'] || 0)),
      railwayStation: Boolean(Number(row['Railway.Station'] || 0)),
      otherTransport: Boolean(Number(row['Other.Transport.-.Auto,.Van.Rickshaw.etc.'] || 0)),
      highways: Boolean(Number(row['Highways'] || 0)),
      puccaRoads: Boolean(Number(row['Other.Pucca.Roads'] || 0)),
      kucchaRoads: Boolean(Number(row['Kuchha.Roads'] || 0))
    };
    
    // Calculate accessibility scores (distance-based, lower is better)
    const accessibility = {
      postOfficeDistance: Number(row['Distance'] || 0),
      telephoneDistance: Number(row['Distance.1'] || 0),
      pcoDistance: Number(row['Distance.2'] || 0),
      internetDistance: Number(row['Distance.3'] || 0),
      courierDistance: Number(row['Distance.4'] || 0),
      publicBusDistance: Number(row['Distance.5'] || 0),
      privateBusDistance: Number(row['Distance.6'] || 0),
      railwayDistance: Number(row['Distance.7'] || 0),
      otherTransportDistance: Number(row['Distance.8'] || 0),
      highwayDistance: Number(row['Distance.9'] || 0),
      puccaRoadDistance: Number(row['Distance.10'] || 0)
    };
    
    // Calculate infrastructure scores
    const waterSanitationScore = Object.values(waterSanitation).filter(v => v === true).length;
    const communicationScore = Object.values(communication).filter(v => v === true).length;
    const transportationScore = Object.values(transportation).filter(v => v === true).length;
    
    // Calculate overall infrastructure index (0-100)
    const totalPossibleInfra = Object.keys(waterSanitation).length + Object.keys(communication).length + Object.keys(transportation).length;
    const totalAvailableInfra = waterSanitationScore + communicationScore + transportationScore;
    const infrastructureIndex = Math.round((totalAvailableInfra / totalPossibleInfra) * 100);
    
    // Calculate average accessibility (lower is better, so we invert it)
    const avgAccessibility = Object.values(accessibility).reduce((sum, dist) => sum + dist, 0) / Object.values(accessibility).length;
    const accessibilityScore = Math.max(0, Math.round(100 - (avgAccessibility * 10))); // Convert to 0-100 scale
    
    // Determine infrastructure quality
    const getQuality = (score) => {
      if (score >= 80) return 'Excellent';
      if (score >= 60) return 'Good';
      if (score >= 40) return 'Fair';
      return 'Poor';
    };
    
    // Generate insights
    const insights = {
      strengths: [],
      improvements: []
    };
    
    // Water & Sanitation insights
    if (waterSanitation.tapWaterTreated) {
      insights.strengths.push('Village has treated tap water supply');
    }
    if (waterSanitation.closedDrainage) {
      insights.strengths.push('Proper closed drainage system available');
    }
    if (waterSanitation.sanitationCampaign) {
      insights.strengths.push('Covered under Total Sanitation Campaign');
    }
    if (waterSanitation.garbageOnRoad) {
      insights.improvements.push('Garbage disposal system needs improvement - waste on roads');
    }
    if (!waterSanitation.communityToilet) {
      insights.improvements.push('Community toilet complex needed');
    }
    
    // Communication insights
    if (communication.internetCafe) {
      insights.strengths.push('Digital connectivity available through internet cafe/CSC');
    }
    if (!communication.postOffice && accessibility.postOfficeDistance > 10) {
      insights.improvements.push('Post office access is limited - nearest is far');
    }
    if (!communication.telephone) {
      insights.improvements.push('Landline telephone connectivity not available');
    }
    
    // Transportation insights
    if (transportation.highways) {
      insights.strengths.push('Connected to highway network');
    }
    if (transportation.publicBus) {
      insights.strengths.push('Public bus service available');
    }
    if (!transportation.railwayStation && accessibility.railwayDistance > 15) {
      insights.improvements.push('Railway connectivity is distant');
    }
    if (!transportation.puccaRoads) {
      insights.improvements.push('Pucca roads needed for better connectivity');
    }
    
    res.json({
      village: req.params.village,
      district: req.params.district,
      demographics,
      waterSanitation,
      communication,
      transportation,
      accessibility,
      scores: {
        waterSanitationScore,
        communicationScore,
        transportationScore,
        infrastructureIndex,
        accessibilityScore,
        quality: getQuality(infrastructureIndex)
      },
      insights,
      clusters: Number(row['Clusters'] || 0)
    });
    
  } catch (e) {
    console.error('Infrastructure analytics error', e);
    res.status(500).json({ message: 'Failed to process infrastructure data', error: String(e) });
  }
});

// API: Irrigation analytics for a specific village
app.get('/api/districts/:district/villages/:village/irrigation-analytics', (req, res) => {
  try {
    if (!cache.ready) return res.status(503).json({ message: 'Index building' });
    const dKey = normalizeKey(req.params.district);
    const vKey = normalizeKey(req.params.village);
    const d = cache.districts[dKey];
    if (!d) return res.status(404).json({ message: 'District not found' });
    const v = d.villages[vKey];
    if (!v) return res.status(404).json({ message: 'Village not found' });
    
    const irrigationData = v.sectors.irrigation;
    if (!irrigationData || !irrigationData.length) {
      return res.json({ message: 'No irrigation data available' });
    }
    
    console.log(`Processing irrigation analytics for ${req.params.district}/${req.params.village}`);
    
    // Process irrigation data for visualization
    const row = irrigationData[0]; // Take first row (should be unique per village)
    
    // Demographics
    const demographics = {
      totalPopulation: Number(row['Total.Population.of.Village'] || 0),
      totalHouseholds: Number(row['Total.Households'] || 0),
      geographicalArea: Number(row['Total.Geographical.Area.(in.Hectares)'] || 0),
      populationDensity: Math.round((Number(row['Total.Population.of.Village'] || 0) / Number(row['Total.Geographical.Area.(in.Hectares)'] || 1)) * 100) / 100
    };
    
    // Water Source Availability
    const waterSources = {
      wellFunctioning: Boolean(Number(row['Well.Functioning'] || 0)),
      handPumpFunctioning: Boolean(Number(row['Hand.Pump.Functioning'] || 0)),
      tubeWellFunctioning: Boolean(Number(row['Tube.Wells/Borehole.Functioning'] || 0)),
      riverCanalStatus: Boolean(Number(row['River/Canal.Status'] || 0)),
      riverCanalAllYear: Boolean(Number(row['River/Canal.Functioning.All.round.the.year'] || 0)),
      tankPondLakeAllYear: Boolean(Number(row['Tank/Pond/Lake.Functioning.All.round.the.year'] || 0))
    };
    
    // Land Usage and Irrigation Coverage
    const landUsage = {
      netAreaSown: Number(row['Net.Area.Sown.(in.Hectares)'] || 0),
      totalUnirrigatedArea: Number(row['Total.Unirrigated.Land.Area.(in.Hectares)'] || 0),
      areaIrrigatedBySource: Number(row['Area.Irrigated.by.Source.(in.Hectares)'] || 0),
      totalCultivableArea: Number(row['Net.Area.Sown.(in.Hectares)'] || 0) + Number(row['Total.Unirrigated.Land.Area.(in.Hectares)'] || 0)
    };
    
    // Irrigation Methods and Areas
    const irrigationMethods = {
      canalsArea: Number(row['Canals.Area.(in.Hectares)'] || 0),
      wellsTubeWellsArea: Number(row['Wells/Tube.Wells.Area.(in.Hectares)'] || 0),
      tanksLakesArea: Number(row['Tanks/Lakes.Area.(in.Hectares)'] || 0),
      waterfallArea: Number(row['Waterfall.Area.(in.Hectares)'] || 0),
      otherSourceArea: Number(row['Other.Source.(specify).Area.(in.Hectares)'] || 0)
    };
    
    // Calculate irrigation efficiency metrics
    const irrigationCoverage = landUsage.totalCultivableArea > 0 
      ? Math.round((landUsage.areaIrrigatedBySource / landUsage.totalCultivableArea) * 100) 
      : 0;
    
    const irrigationEfficiency = landUsage.netAreaSown > 0 
      ? Math.round((landUsage.areaIrrigatedBySource / landUsage.netAreaSown) * 100) 
      : 0;
    
    const unirrigatedPercentage = landUsage.totalCultivableArea > 0 
      ? Math.round((landUsage.totalUnirrigatedArea / landUsage.totalCultivableArea) * 100) 
      : 0;
    
    // Water source availability score
    const waterSourceCount = Object.values(waterSources).filter(v => v === true).length;
    const waterSourceScore = Math.round((waterSourceCount / Object.keys(waterSources).length) * 100);
    
    // Primary irrigation method
    const irrigationMethodsArray = [
      { method: 'Canals', area: irrigationMethods.canalsArea },
      { method: 'Wells/Tube Wells', area: irrigationMethods.wellsTubeWellsArea },
      { method: 'Tanks/Lakes', area: irrigationMethods.tanksLakesArea },
      { method: 'Waterfall', area: irrigationMethods.waterfallArea },
      { method: 'Other Sources', area: irrigationMethods.otherSourceArea }
    ];
    
    const primaryMethod = irrigationMethodsArray.reduce((max, current) => 
      current.area > max.area ? current : max, irrigationMethodsArray[0]
    );
    
    // Determine irrigation status
    const getIrrigationStatus = (coverage) => {
      if (coverage >= 80) return 'Excellent';
      if (coverage >= 60) return 'Good';
      if (coverage >= 40) return 'Moderate';
      if (coverage >= 20) return 'Limited';
      return 'Poor';
    };
    
    // Generate insights
    const insights = {
      strengths: [],
      improvements: [],
      recommendations: []
    };
    
    // Water sources insights
    if (waterSources.riverCanalAllYear) {
      insights.strengths.push('Reliable year-round water supply from river/canal');
    }
    if (waterSources.tubeWellFunctioning) {
      insights.strengths.push('Tube well/borehole available for groundwater access');
    }
    if (waterSources.handPumpFunctioning) {
      insights.strengths.push('Hand pump provides backup water source');
    }
    if (!waterSources.wellFunctioning && !waterSources.tubeWellFunctioning) {
      insights.improvements.push('No functioning wells or tube wells - groundwater access limited');
    }
    
    // Irrigation coverage insights
    if (irrigationCoverage >= 80) {
      insights.strengths.push(`Excellent irrigation coverage (${irrigationCoverage}% of cultivable land)`);
    } else if (irrigationCoverage >= 60) {
      insights.strengths.push(`Good irrigation coverage (${irrigationCoverage}% of cultivable land)`);
    } else if (irrigationCoverage < 40) {
      insights.improvements.push(`Low irrigation coverage (${irrigationCoverage}%) - majority of land remains unirrigated`);
    }
    
    // Primary method insights
    if (primaryMethod.area > 0) {
      insights.strengths.push(`Primary irrigation method: ${primaryMethod.method} (${primaryMethod.area} hectares)`);
    }
    
    // Recommendations based on analysis
    if (unirrigatedPercentage > 50) {
      insights.recommendations.push('Consider developing additional water sources to irrigate more agricultural land');
    }
    if (waterSourceCount <= 2) {
      insights.recommendations.push('Diversify water sources to reduce dependency and ensure reliability');
    }
    if (irrigationMethods.canalsArea === 0 && waterSources.riverCanalStatus) {
      insights.recommendations.push('Canal irrigation could be developed given river/canal availability');
    }
    if (landUsage.areaIrrigatedBySource < landUsage.netAreaSown) {
      insights.recommendations.push('Expand irrigation infrastructure to cover all sown areas');
    }
    
    res.json({
      village: req.params.village,
      district: req.params.district,
      demographics,
      waterSources,
      landUsage,
      irrigationMethods,
      metrics: {
        irrigationCoverage,
        irrigationEfficiency,
        unirrigatedPercentage,
        waterSourceScore,
        waterSourceCount,
        primaryMethod: primaryMethod.method,
        status: getIrrigationStatus(irrigationCoverage)
      },
      insights,
      clusters: Number(row['Clusters'] || 0)
    });
    
  } catch (e) {
    console.error('Irrigation analytics error', e);
    res.status(500).json({ message: 'Failed to process irrigation data', error: String(e) });
  }
});

// API: Social analytics for a specific village
app.get('/api/districts/:district/villages/:village/social-analytics', (req, res) => {
  try {
    if (!cache.ready) return res.status(503).json({ message: 'Index building' });
    const dKey = normalizeKey(req.params.district);
    const vKey = normalizeKey(req.params.village);
    const d = cache.districts[dKey];
    if (!d) return res.status(404).json({ message: 'District not found' });
    const v = d.villages[vKey];
    if (!v) return res.status(404).json({ message: 'Village not found' });
    
    const socialData = v.sectors.social;
    if (!socialData || !socialData.length) {
      return res.json({ message: 'No social data available' });
    }
    
    console.log(`Processing social analytics for ${req.params.district}/${req.params.village}`);
    
    // Process social data for visualization
    const row = socialData[0]; // Take first row (should be unique per village)
    
    // Demographics
    const demographics = {
      totalPopulation: Number(row['Total.Population.of.Village'] || 0),
      totalHouseholds: Number(row['Total.Households'] || 0),
      geographicalArea: Number(row['Total.Geographical.Area.(in.Hectares)'] || 0),
      populationDensity: Math.round((Number(row['Total.Population.of.Village'] || 0) / Number(row['Total.Geographical.Area.(in.Hectares)'] || 1)) * 100) / 100
    };
    
    // Financial Services
    const financialServices = {
      banks: Boolean(Number(row['Banks.on.any.Kind'] || 0)),
      agricreditSocieties: Boolean(Number(row['Agricultural.Credit.Societies'] || 0)),
      agriculturalMarketingSociety: Boolean(Number(row['Agricultural.Marketing.Society'] || 0))
    };
    
    // Market Facilities
    const marketFacilities = {
      mandisRegularMarket: Boolean(Number(row['Mandis/Regular.Market'] || 0)),
      weeklyHaat: Boolean(Number(row['Weekly.Haat'] || 0))
    };
    
    // Community Services
    const communityServices = {
      asha: Boolean(Number(row['ASHA'] || 0)),
      communityCentreWithTV: Boolean(Number(row['Community.Centre.with/without.TV'] || 0)),
      publicLibrary: Boolean(Number(row['Public.Library'] || 0)),
      assemblyPollingStation: Boolean(Number(row['Assembly.Polling.Station'] || 0))
    };
    
    // Recreational Facilities
    const recreationalFacilities = {
      sportsField: Boolean(Number(row['Sports.Field'] || 0)),
      sportsClubRecreation: Boolean(Number(row['Sports.Club/Recreation.Centre'] || 0))
    };
    
    // Accessibility (distances - lower is better)
    const accessibility = {
      bankDistance: Number(row['Distance'] || 0),
      agricreditDistance: Number(row['Distance.1'] || 0),
      mandiDistance: Number(row['Distance.2'] || 0),
      weeklyHaatDistance: Number(row['Distance.3'] || 0),
      agriMarketingDistance: Number(row['Distance.4'] || 0),
      ashaDistance: Number(row['Distance.5'] || 0),
      communityCentreDistance: Number(row['Distance.6'] || 0),
      sportsFieldDistance: Number(row['Distance.7'] || 0),
      sportsClubDistance: Number(row['Distance.8'] || 0),
      libraryDistance: Number(row['Distance.9'] || 0),
      pollingStationDistance: Number(row['Distance.10'] || 0)
    };
    
    // Calculate service availability scores
    const financialScore = Object.values(financialServices).filter(v => v === true).length;
    const marketScore = Object.values(marketFacilities).filter(v => v === true).length;
    const communityScore = Object.values(communityServices).filter(v => v === true).length;
    const recreationalScore = Object.values(recreationalFacilities).filter(v => v === true).length;
    
    // Calculate overall social infrastructure index (0-100)
    const totalPossibleServices = Object.keys(financialServices).length + 
                                 Object.keys(marketFacilities).length + 
                                 Object.keys(communityServices).length + 
                                 Object.keys(recreationalFacilities).length;
    const totalAvailableServices = financialScore + marketScore + communityScore + recreationalScore;
    const socialInfrastructureIndex = Math.round((totalAvailableServices / totalPossibleServices) * 100);
    
    // Calculate average accessibility score (lower distance is better, so we invert it)
    const avgAccessibility = Object.values(accessibility).reduce((sum, dist) => sum + dist, 0) / Object.values(accessibility).length;
    const accessibilityScore = Math.max(0, Math.round(100 - (avgAccessibility * 7))); // Convert to 0-100 scale
    
    // Determine social infrastructure quality
    const getQuality = (score) => {
      if (score >= 80) return 'Excellent';
      if (score >= 60) return 'Good';
      if (score >= 40) return 'Fair';
      return 'Poor';
    };
    
    // Generate insights
    const insights = {
      strengths: [],
      improvements: [],
      recommendations: []
    };
    
    // Financial services insights
    if (financialServices.banks) {
      insights.strengths.push('Banking services available in the village');
    }
    if (financialServices.agricreditSocieties) {
      insights.strengths.push('Agricultural credit societies provide farming financial support');
    }
    if (!financialServices.banks && accessibility.bankDistance > 10) {
      insights.improvements.push('Banking access is limited - nearest bank is distant');
    }
    
    // Market facilities insights
    if (marketFacilities.mandisRegularMarket) {
      insights.strengths.push('Regular market/mandi available for agricultural produce');
    }
    if (marketFacilities.weeklyHaat) {
      insights.strengths.push('Weekly haat provides local trading opportunities');
    }
    if (!marketFacilities.mandisRegularMarket && !marketFacilities.weeklyHaat) {
      insights.improvements.push('No local market facilities - farmers may face selling challenges');
    }
    
    // Community services insights
    if (communityServices.asha) {
      insights.strengths.push('ASHA worker available for healthcare support');
    }
    if (communityServices.communityCentreWithTV) {
      insights.strengths.push('Community center with TV provides information and entertainment');
    }
    if (communityServices.assemblyPollingStation) {
      insights.strengths.push('Village has assembly polling station for democratic participation');
    }
    if (!communityServices.publicLibrary) {
      insights.improvements.push('Public library needed for educational resources');
    }
    
    // Recreational facilities insights
    if (recreationalFacilities.sportsField) {
      insights.strengths.push('Sports field available for physical activities');
    }
    if (!recreationalFacilities.sportsField && !recreationalFacilities.sportsClubRecreation) {
      insights.improvements.push('Recreational facilities limited - sports and entertainment options needed');
    }
    
    // Recommendations based on analysis
    if (socialInfrastructureIndex < 40) {
      insights.recommendations.push('Significant investment needed in social infrastructure development');
    }
    if (financialScore === 0) {
      insights.recommendations.push('Establish banking or financial service access points');
    }
    if (marketScore === 0) {
      insights.recommendations.push('Develop market facilities to support local economy');
    }
    if (recreationalScore === 0) {
      insights.recommendations.push('Create recreational facilities for community well-being');
    }
    if (avgAccessibility > 8) {
      insights.recommendations.push('Improve transportation links to reduce service access distances');
    }
    
    res.json({
      village: req.params.village,
      district: req.params.district,
      demographics,
      financialServices,
      marketFacilities,
      communityServices,
      recreationalFacilities,
      accessibility,
      scores: {
        financialScore,
        marketScore,
        communityScore,
        recreationalScore,
        socialInfrastructureIndex,
        accessibilityScore,
        quality: getQuality(socialInfrastructureIndex)
      },
      insights,
      clusters: Number(row['Clusters'] || 0)
    });
    
  } catch (e) {
    console.error('Social analytics error', e);
    res.status(500).json({ message: 'Failed to process social data', error: String(e) });
  }
});

// API: Get aggregated sector statistics across all villages
app.get('/api/sectors/statistics', async (req, res) => {
  try {
    if (!cache.ready) return res.status(503).json({ message: 'Index building' });
    
    const sectorStats = {
      agriculture: { villages: 0, totalArea: 0, irrigatedArea: 0, features: [] },
      education: { villages: 0, totalSchools: 0, totalPopulation: 0, features: [] },
      health: { villages: 0, totalFacilities: 0, totalDoctors: 0, features: [] },
      infra: { villages: 0, waterAccess: 0, roadAccess: 0, features: [] },
      irrigation: { villages: 0, irrigatedLand: 0, waterSources: 0, features: [] },
      social: { villages: 0, financialServices: 0, marketFacilities: 0, features: [] }
    };
    
    // Iterate through all districts and villages
    for (const district of Object.values(cache.districts)) {
      for (const village of Object.values(district.villages)) {
        // Agriculture stats
        if (village.sectors.agriculture && village.sectors.agriculture.length > 0) {
          const row = village.sectors.agriculture[0];
          sectorStats.agriculture.villages++;
          sectorStats.agriculture.totalArea += Number(row['Total.Geographical.Area.(in.Hectares)'] || 0);
          // Count forest area and agricultural land
          sectorStats.agriculture.totalForestArea = (sectorStats.agriculture.totalForestArea || 0) + Number(row['Forest.Area.(in.Hectares)'] || 0);
          sectorStats.agriculture.totalHouseholds = (sectorStats.agriculture.totalHouseholds || 0) + Number(row['Total.Households'] || 0);
          sectorStats.agriculture.totalPopulation = (sectorStats.agriculture.totalPopulation || 0) + Number(row['Total.Population.of.Village'] || 0);
          // Count crop cultivation
          if (Number(row['Wheat']) === 1) sectorStats.agriculture.wheatVillages = (sectorStats.agriculture.wheatVillages || 0) + 1;
          if (Number(row['Rice']) === 1) sectorStats.agriculture.riceVillages = (sectorStats.agriculture.riceVillages || 0) + 1;
        }
        
        // Education stats
        if (village.sectors.education && village.sectors.education.length > 0) {
          const row = village.sectors.education[0];
          sectorStats.education.villages++;
          sectorStats.education.totalPopulation += Number(row['Total.Population.of.Village'] || 0);
          sectorStats.education.totalSchools += 
            Number(row['Total.Pre...Primary.School'] || row['Total.Pre.-.Primary.School'] || 0) +
            Number(row['Total.Middle.Schools'] || 0) +
            Number(row['Total.Secondary.Schools'] || 0) +
            Number(row['Total.Senior.Secondary.Schools'] || 0);
        }
        
        // Health stats
        if (village.sectors.health && village.sectors.health.length > 0) {
          const row = village.sectors.health[0];
          sectorStats.health.villages++;
          sectorStats.health.totalPopulation = (sectorStats.health.totalPopulation || 0) + Number(row['Total.Population.of.Village'] || 0);
          
          // Count all health facilities
          const phc = Number(row['Primary.Health.Centre..Numbers.'] || 0);
          const subCentre = Number(row['Primary.Heallth.Sub.Centre..Numbers.'] || 0);
          const hospital = Number(row['Hospital.Allopathic..Numbers.'] || 0);
          const altMedicine = Number(row['Hospiltal.Alternative.Medicine..Numbers.'] || 0);
          const dispensary = Number(row['Dispensary..Numbers.'] || 0);
          const vetHospital = Number(row['Veterinary.Hospital..Numbers.'] || 0);
          
          sectorStats.health.totalFacilities += phc + subCentre + hospital + altMedicine + dispensary + vetHospital;
          
          // Track distance to PHC and Sub-Centre (most common facilities)
          const phcDistance = Number(row['Distance.1'] || 0);
          const subCentreDistance = Number(row['Distance.2'] || 0);
          if (phcDistance > 0) {
            sectorStats.health.phcDistanceSum = (sectorStats.health.phcDistanceSum || 0) + phcDistance;
            sectorStats.health.phcDistanceCount = (sectorStats.health.phcDistanceCount || 0) + 1;
            if (phcDistance <= 5) sectorStats.health.within5kmPHC = (sectorStats.health.within5kmPHC || 0) + 1;
          }
          if (subCentreDistance > 0) {
            sectorStats.health.subCentreDistanceSum = (sectorStats.health.subCentreDistanceSum || 0) + subCentreDistance;
            sectorStats.health.subCentreDistanceCount = (sectorStats.health.subCentreDistanceCount || 0) + 1;
            if (subCentreDistance <= 5) sectorStats.health.within5kmSubCentre = (sectorStats.health.within5kmSubCentre || 0) + 1;
          }
          
          // Count villages with at least one facility
          if (phc + subCentre + hospital + altMedicine + dispensary + vetHospital > 0) {
            sectorStats.health.villagesWithFacilities = (sectorStats.health.villagesWithFacilities || 0) + 1;
          }
          
          // Count doctors in position
          const phcDoctors = Number(row['Primary.Health.Centre.Doctors.In.Position..Numbers.'] || 0);
          const subCentreDoctors = Number(row['Primary.Heallth.Sub.Centre.Doctors.In.Position..Numbers.'] || 0);
          const hospitalDoctors = Number(row['Hospital.Allopathic.Doctors.In.Position..Numbers.'] || 0);
          const altMedDoctors = Number(row['Hospiltal.Alternative.Medicine.Doctors.In.Position..Numbers.'] || 0);
          const dispensaryDoctors = Number(row['Dispensary.Doctors.In.Position..Numbers.'] || 0);
          const vetDoctors = Number(row['Veterinary.Hospital.Doctors.In.Position..Numbers.'] || 0);
          
          sectorStats.health.totalDoctors += phcDoctors + subCentreDoctors + hospitalDoctors + altMedDoctors + dispensaryDoctors + vetDoctors;
        }
        
        // Infrastructure stats
        if (village.sectors.infra && village.sectors.infra.length > 0) {
          const row = village.sectors.infra[0];
          sectorStats.infra.villages++;
          if (Number(row['Tap.Water-Treated'] || 0)) sectorStats.infra.waterAccess++;
          if (Number(row['Other.Pucca.Roads'] || 0)) sectorStats.infra.roadAccess++;
        }
        
        // Irrigation stats
        if (village.sectors.irrigation && village.sectors.irrigation.length > 0) {
          const row = village.sectors.irrigation[0];
          sectorStats.irrigation.villages++;
          sectorStats.irrigation.irrigatedLand += Number(row['Area.Irrigated.by.Source.(in.Hectares)'] || 0);
          let sources = 0;
          if (Number(row['Well.Functioning'] || 0)) sources++;
          if (Number(row['Hand.Pump.Functioning'] || 0)) sources++;
          if (Number(row['Tube.Wells/Borehole.Functioning'] || 0)) sources++;
          if (Number(row['River/Canal.Status'] || 0)) sources++;
          sectorStats.irrigation.waterSources += sources;
        }
        
        // Social stats
        if (village.sectors.social && village.sectors.social.length > 0) {
          const row = village.sectors.social[0];
          sectorStats.social.villages++;
          if (Number(row['Banks.on.any.Kind'] || 0)) sectorStats.social.financialServices++;
          if (Number(row['Mandis/Regular.Market'] || 0) || Number(row['Weekly.Haat'] || 0)) {
            sectorStats.social.marketFacilities++;
          }
        }
      }
    }
    
    // Calculate averages and prepare features
    const result = {
      agriculture: {
        totalVillages: sectorStats.agriculture.villages,
        avgAreaPerVillage: sectorStats.agriculture.villages > 0 
          ? Math.round(sectorStats.agriculture.totalArea / sectorStats.agriculture.villages) 
          : 0,
        avgPopulation: sectorStats.agriculture.villages > 0 
          ? Math.round((sectorStats.agriculture.totalPopulation || 0) / sectorStats.agriculture.villages) 
          : 0,
        avgHouseholds: sectorStats.agriculture.villages > 0 
          ? Math.round((sectorStats.agriculture.totalHouseholds || 0) / sectorStats.agriculture.villages) 
          : 0,
        avgForestArea: sectorStats.agriculture.villages > 0 
          ? Math.round((sectorStats.agriculture.totalForestArea || 0) / sectorStats.agriculture.villages) 
          : 0,
        wheatCultivation: sectorStats.agriculture.villages > 0 
          ? Math.round(((sectorStats.agriculture.wheatVillages || 0) / sectorStats.agriculture.villages) * 100) 
          : 0,
        riceCultivation: sectorStats.agriculture.villages > 0 
          ? Math.round(((sectorStats.agriculture.riceVillages || 0) / sectorStats.agriculture.villages) * 100) 
          : 0,
        features: [
          'Total geographical area (hectares)',
          'Total households',
          'Total population (male, female breakdown)',
          'Wheat cultivation (binary indicator)',
          'Rice cultivation (binary indicator)',
          'Mustard cultivation (binary indicator)',
          'Other crops cultivation',
          'Forest area (hectares)',
          'Area under non-agricultural uses',
          'Barren & uncultivable land area',
          'Permanent pastures and grazing land',
          'Land under miscellaneous tree crops',
          'Culturable waste land area',
          'Fallow land (other than current)',
          'Current fallow land area',
          'Village clustering classification',
          'Total: 20 columns tracked per village'
        ]
      },
      education: {
        totalVillages: sectorStats.education.villages,
        avgSchoolsPerVillage: sectorStats.education.villages > 0 
          ? (sectorStats.education.totalSchools / sectorStats.education.villages).toFixed(1) 
          : 0,
        totalPopulation: sectorStats.education.totalPopulation,
        schoolsPerThousand: sectorStats.education.totalPopulation > 0 
          ? ((sectorStats.education.totalSchools / sectorStats.education.totalPopulation) * 1000).toFixed(2) 
          : 0,
        features: [
          'Total geographical area and demographics',
          'Total pre-primary schools',
          'Distance to pre-primary school',
          'Total middle schools',
          'Distance to middle school',
          'Total secondary schools',
          'Distance to secondary school',
          'Total senior secondary schools',
          'Distance to senior secondary school',
          'Arts and science degree college',
          'Distance to degree college',
          'Engineering college access',
          'Distance to engineering college',
          'Medical college access',
          'Distance to medical college',
          'Management institute access',
          'Distance to management institute',
          'Vocational training school/ITI',
          'Distance to vocational training',
          'Non-formal training center status',
          'School for disabled',
          'Distance to school for disabled',
          'Village clustering classification',
          'Total: 30 columns tracked per village'
        ]
      },
      health: {
        totalVillages: sectorStats.health.villages,
        avgDistanceToPHC: sectorStats.health.phcDistanceCount > 0 
          ? (sectorStats.health.phcDistanceSum / sectorStats.health.phcDistanceCount).toFixed(1) 
          : 0,
        avgDistanceToSubCentre: sectorStats.health.subCentreDistanceCount > 0 
          ? (sectorStats.health.subCentreDistanceSum / sectorStats.health.subCentreDistanceCount).toFixed(1) 
          : 0,
        within5kmPHC: sectorStats.health.villages > 0 
          ? Math.round(((sectorStats.health.within5kmPHC || 0) / sectorStats.health.villages) * 100) 
          : 0,
        within5kmSubCentre: sectorStats.health.villages > 0 
          ? Math.round(((sectorStats.health.within5kmSubCentre || 0) / sectorStats.health.villages) * 100) 
          : 0,
        avgPopulation: sectorStats.health.villages > 0 
          ? Math.round((sectorStats.health.totalPopulation || 0) / sectorStats.health.villages) 
          : 0,
        features: [
          'Community health center (numbers, positions, required strength, distance)',
          'Primary health center (numbers, doctor strength, in-position, distance)',
          'Primary health sub-center (numbers, doctors, in-position, distance)',
          'Maternity & child welfare center (numbers, doctors, distance)',
          'TB clinic (numbers, doctors, distance)',
          'Hospital allopathic (numbers, doctors, distance)',
          'Hospital alternative medicine (numbers, doctors, distance)',
          'Dispensary (numbers, doctors, distance)',
          'Veterinary hospital (numbers, doctors, distance)',
          'Mobile health clinic (numbers, doctors, distance)',
          'Family welfare center (numbers, doctors, distance)',
          'Total required vs actual doctor strength tracking',
          'In-position doctor counts for all facility types',
          'Distance metrics for all 11 facility types',
          'Total: 52 columns tracked per village'
        ]
      },
      infra: {
        totalVillages: sectorStats.infra.villages,
        waterAccessPercentage: sectorStats.infra.villages > 0 
          ? Math.round((sectorStats.infra.waterAccess / sectorStats.infra.villages) * 100) 
          : 0,
        roadAccessPercentage: sectorStats.infra.villages > 0 
          ? Math.round((sectorStats.infra.roadAccess / sectorStats.infra.villages) * 100) 
          : 0,
        features: [
          'Tap water (treated)',
          'Closed drainage system',
          'Open drainage system',
          'Water treatment / sewage plants',
          'Total sanitation campaign (TSC)',
          'Community toilet complex (general public)',
          'Community waste disposal system (house-to-house)',
          'Community bio-gas / waste recycling',
          'No system (garbage on road/street)',
          'Post office or sub-post office',
          'Telephone access and distance',
          'PCO (public call office) and distance',
          'Internet cafes / CSC and distance',
          'Private courier facility and distance',
          'Public bus service and distance',
          'Private bus service status and distance',
          'Railway station and distance',
          'Other transport (auto, van rickshaw) and distance',
          'Highways and distance',
          'Other pucca roads and distance',
          'Kuchha roads',
          'Village clustering classification',
          'Total: 42 columns tracked per village'
        ]
      },
      irrigation: {
        totalVillages: sectorStats.irrigation.villages,
        avgIrrigatedLand: sectorStats.irrigation.villages > 0 
          ? Math.round(sectorStats.irrigation.irrigatedLand / sectorStats.irrigation.villages) 
          : 0,
        avgWaterSources: sectorStats.irrigation.villages > 0 
          ? (sectorStats.irrigation.waterSources / sectorStats.irrigation.villages).toFixed(1) 
          : 0,
        features: [
          'Well functioning status',
          'Hand pump functioning status',
          'Tube wells/borehole functioning',
          'River/canal status',
          'River/canal functioning all year round',
          'Tank/pond/lake functioning all year',
          'Net area sown (hectares)',
          'Total unirrigated land area',
          'Area irrigated by source (hectares)',
          'Canals area (hectares)',
          'Wells/tube wells area (hectares)',
          'Tanks/lakes area (hectares)',
          'Waterfall area (hectares)',
          'Other source area (hectares)',
          'Village clustering classification',
          'Total: 22 columns tracked per village'
        ]
      },
      social: {
        totalVillages: sectorStats.social.villages,
        financialServiceCoverage: sectorStats.social.villages > 0 
          ? Math.round((sectorStats.social.financialServices / sectorStats.social.villages) * 100) 
          : 0,
        marketFacilityCoverage: sectorStats.social.villages > 0 
          ? Math.round((sectorStats.social.marketFacilities / sectorStats.social.villages) * 100) 
          : 0,
        features: [
          'Total geographical area and demographics',
          'Banks of any kind',
          'Distance to bank',
          'Agricultural credit societies',
          'Distance to credit society',
          'Mandis/regular market',
          'Distance to mandi/market',
          'Weekly haat (periodic market)',
          'Distance to weekly haat',
          'Agricultural marketing society',
          'Distance to agri marketing society',
          'ASHA (health worker)',
          'Distance to ASHA',
          'Community center with/without TV',
          'Distance to community center',
          'Sports field',
          'Distance to sports field',
          'Sports club/recreation center',
          'Distance to sports club',
          'Public library',
          'Distance to public library',
          'Assembly polling station',
          'Distance to polling station',
          'Village clustering classification',
          'Total: 30 columns tracked per village'
        ]
      }
    };
    
    res.json(result);
  } catch (e) {
    console.error('Sector statistics error', e);
    res.status(500).json({ message: 'Failed to compute sector statistics', error: String(e) });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`District Explorer backend listening on http://localhost:${PORT}`);
});
