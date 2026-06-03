exports.handler = async function(event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured. Add ANTHROPIC_API_KEY to Netlify environment variables.' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  if (body.ping) return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  const { brand, session, location, outputType, channel, mood } = body;

  const PROFILES = {
    "Chanel": { t: "Parisian elegance", a: "Avenue Montaigne. Effortless French grace. She doesn't need to be noticed.", s: "Elegant vocal house, piano stabs, French influences, 120 BPM", p: "Cream, blush pink, ivory, black", cv: "Spare, poetic, Parisian. Implies more than it says." },
    "Prada": { t: "Intellectual fashion", a: "Milan. Architectural luxury. Intelligence as aesthetic.", s: "Minimal deep house, sparse vocals, dark bass, 122 BPM", p: "Burgundy, black, white", cv: "Precise, minimal, slightly cold. One sentence that makes you think." },
    "Hermes": { t: "Heritage luxury", a: "Quiet confidence. Expensive without trying. Craftsmanship self-evident.", s: "Organic house, acoustic textures, warm bass, 118 BPM", p: "Cognac, orange, cream", cv: "Unhurried, wise. Like something a grandmother who wore Hermes would say." },
    "Dior": { t: "Couture glamour", a: "Paris Fashion Week. Glamour with gravity. Couture as architecture.", s: "Runway house, female vocal chops, bright synths, 124 BPM", p: "Grey, white, silver", cv: "Romantic but measured. Opens a fashion editorial." },
    "Armani": { t: "Effortless sophistication", a: "Luxury hotel lobby. Italian ease. Power worn lightly.", s: "Lounge house, smooth keys, warm bass, 120 BPM", p: "Greige, navy, charcoal", cv: "Quiet authority. A well-dressed man of 50 without looking up." },
    "Saint Laurent": { t: "Night-time glamour", a: "Paris after dark. Confidence as currency. The boutique stays open late.", s: "Dark house, moody synths, sparse vocals, 124 BPM", p: "Black, gold", cv: "One line with an edge. Certain, not aggressive." },
    "Louis Vuitton": { t: "Travel luxury", a: "Airport lounge meets flagship. Movement as identity.", s: "Travel house, airy pads, global influences, 122 BPM", p: "Camel, brown, cream", cv: "Suggests movement. The feeling of a departure gate at a good airport." },
    "Gucci": { t: "Fashion glamour", a: "Milan. Confident. Glamour worn without apology.", s: "Vocal house, energetic grooves, female vocals, 124 BPM", p: "Emerald green, deep red, gold", cv: "Warmer and more exuberant. Still luxury — but with a smile." },
    "Balenciaga": { t: "Future luxury", a: "Fashion week in 2030. Bold. Electric. Challenges its own category.", s: "Tech house, futuristic production, powerful energy, 126 BPM", p: "Black, charcoal, silver, electric blue", cv: "Minimal, slightly confrontational. Forward-facing." },
    "Bottega Veneta": { t: "Quiet luxury", a: "When your own initials are enough. Private wealth, public restraint.", s: "Organic house, refined deep grooves, understated, 120 BPM", p: "Olive, forest green, chocolate, cream", cv: "Says less than it means. Rewards a second read." },
    "Burberry": { t: "British heritage travel", a: "First-class rail. Mayfair hotel. Exploration as British tradition.", s: "Sophisticated deep house, piano motifs, atmospheric strings, 120 BPM", p: "Camel, stone, beige, forest green, navy", cv: "British understatement. Implies far more than it says." },
    "Monvoy": { t: "Luxury in motion", a: "The moment between destinations. She is not trying to be seen — she is arriving. Those who know, know.", s: "Mediterranean organic house, warm bass, female vocals, guitar accents, cinematic, 120 BPM", p: "Mediterranean blue, navy, ivory, honey tan, soft gold", cv: "Carries the feeling of a place. Makes you want to be somewhere." }
  };

  const p = PROFILES[brand] || {};

  let systemPrompt, userPrompt;

  if (channel === 'inshop' && brand) {
    systemPrompt = `You are the creative director for InShopMusic, an independent luxury ambient music channel. Think like a senior luxury agency creative — not a content tool.

Brand: ${brand} | Territory: ${p.t}
Atmosphere: ${p.a}
Music: ${p.s}
Palette: ${p.p}
Caption voice: ${p.cv}

Monvoy context (outreach only): British-German luxury leather goods. Key organisers, glasses cases. Luxury in motion. Carrying with intention. Mediterranean lifestyle.

Return ONLY valid JSON, single line strings, no markdown:
{"youtube_title":"","youtube_description":"","youtube_tags":"","spotify_description":"","instagram_captions":["","",""],"tiktok_scripts":["",""],"pinterest_pins":["","","","",""],"suno_prompt":"","image_prompt":"","track_structure":"","outreach_brief":""}

Caption voice: ${p.cv}
Instagram captions must sound like the brand's own creative director. Benchmark: "Timeless elegance never needs to raise its voice."
Track structure: creative direction for 5 phases of a 2-hour session (intro/build/main/intimate/close).
Image prompt: appropriate woman for brand, clean background with typography space, ultra realistic 8K.
YouTube title format: BRAND NAME | Description | Year`;

    userPrompt = `Brand: ${brand}, Session: ${session}, Location: ${location || 'brand signature atmosphere'}, Output: ${outputType}`;

  } else {
    systemPrompt = `You are the creative director for In Studio Music, ambient music for photo shoots, film sets, creative studios. Long sets, no jarring transitions. Monvoy (luxury leather goods) appears naturally — never promoted, simply present.

Write like a working photographer. Direct, professional, atmospheric.

Return ONLY valid JSON, no markdown:
{"youtube_title":"","youtube_description":"","youtube_tags":"","spotify_description":"","instagram_captions":["",""],"tiktok_scripts":[""],"suno_prompt":"","image_prompt":"","track_structure":""}`;

    userPrompt = `Session: ${session}, Mood: ${mood || 'calm focus, morning light'}, Output: ${outputType}`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return { statusCode: response.status, headers, body: JSON.stringify({ error: data.error?.message || `API error ${response.status}` }) };
    return { statusCode: 200, headers, body: JSON.stringify(data) };

  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
