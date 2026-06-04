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
  if (!apiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not configured.' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch(e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) }; }

  if (body.ping) return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };

  const { brand, session, location, outputType, channel, mood, styling, duration } = body;

  const PROFILES = {
    "Chanel": {
      t: "Parisian elegance",
      a: "Avenue Montaigne. Effortless French grace. She does not need to be noticed.",
      s: "Elegant vocal house, piano stabs, refined French house influences, 118-122 BPM",
      p: "Soft pink, cream, ivory, black accents",
      cv: "Spare, poetic, Parisian. Implies more than it says.",
      model: "French woman, blonde or soft brunette, 20-25, refined beauty, soft femininity, graceful rather than overtly sexy",
      expression: "Calm, composed, slightly distant — not performing for the camera",
      lighting: "Soft diffused studio light, warm and even, no harsh shadows",
      background: "Clean cream or blush pink studio, generous empty space for typography overlay"
    },
    "Prada": {
      t: "Intellectual fashion",
      a: "Milan. Architectural luxury. Intelligence as aesthetic.",
      s: "Minimal deep house, sparse vocals, dark bass, modern synths, 120-124 BPM",
      p: "Burgundy, black, white",
      cv: "Precise, minimal, slightly cold. One sentence that makes you think.",
      model: "Italian woman, dark hair, 20-26, strong features, intelligent expression, slightly aloof editorial beauty",
      expression: "Direct, unreadable, confident — she is the architecture",
      lighting: "High contrast, clean shadows, architectural light",
      background: "Stark white or deep burgundy, minimal, space for bold typography"
    },
    "Hermes": {
      t: "Heritage luxury",
      a: "Quiet confidence. Expensive without trying. Craftsmanship self-evident.",
      s: "Organic house, acoustic textures, warm bass, refined lounge, 116-120 BPM",
      p: "Cognac, orange, cream",
      cv: "Unhurried, wise. Like something a grandmother who wore Hermes would say.",
      model: "European woman, 20-26, timeless natural beauty, graceful, unaffected elegance",
      expression: "Warm but self-contained, unhurried, at ease with herself",
      lighting: "Warm golden quality, natural and flattering, soft shadows",
      background: "Warm cognac and cream tones, soft and uncluttered, space for refined typography"
    },
    "Dior": {
      t: "Couture glamour",
      a: "Paris Fashion Week. Glamour with gravity. Couture as architecture.",
      s: "Runway house, female vocal chops, bright synths, fashion energy, 122-126 BPM",
      p: "Grey, white, silver",
      cv: "Romantic but measured. Opens a fashion editorial.",
      model: "Parisian woman, 20-25, couture beauty, sophisticated glamour, flawless complexion",
      expression: "Assured, romantic, aware of her effect — glamour worn with gravity",
      lighting: "Soft glamour lighting, slight luminosity, flattering and cinematic",
      background: "Pale grey or silver-white, clean and elegant, space for Dior-style typography"
    },
    "Armani": {
      t: "Effortless sophistication",
      a: "Luxury hotel lobby. Italian ease. Power worn lightly.",
      s: "Lounge house, smooth keys, warm bass, soft vocals, 118-122 BPM",
      p: "Greige, navy, charcoal",
      cv: "Quiet authority. The room adjusts to them.",
      model: "Mediterranean woman, 20-26, sophisticated, understated, relaxed authority",
      expression: "Effortless, unhurried — the room adjusts to her, not the reverse",
      lighting: "Warm, even, luxurious — hotel lobby quality light",
      background: "Greige or warm charcoal, uncluttered, space for clean typography"
    },
    "Saint Laurent": {
      t: "Night-time glamour",
      a: "Paris after dark. Confidence as currency. The boutique stays open late.",
      s: "Dark house, moody synths, sparse vocals, deep bass, 122-126 BPM",
      p: "Black, gold",
      cv: "One line with an edge. Certain, not aggressive.",
      model: "Woman, 20-25, dramatic beauty, strong features, high confidence, striking rather than merely pretty",
      expression: "Owns the room. Not aggressive — simply certain.",
      lighting: "Low key, dramatic shadows, evening quality, pools of warm light against black",
      background: "Deep black or near-black, gold accent tones, space for bold typography"
    },
    "Louis Vuitton": {
      t: "Travel luxury",
      a: "Airport lounge meets flagship. Movement as identity.",
      s: "Travel house, airy pads, global influences, smooth percussion, 120-124 BPM",
      p: "Camel, brown, cream",
      cv: "Suggests movement. The feeling of a departure gate at a good airport.",
      model: "Woman, 20-26, worldly, sophisticated — she has been somewhere extraordinary and is about to leave again",
      expression: "Curious, confident, mid-journey — between arrivals",
      lighting: "Clean bright natural light, airport lounge or hotel lobby quality",
      background: "Warm camel and cream tones, travel context suggested, space for typography"
    },
    "Gucci": {
      t: "Fashion glamour",
      a: "Milan. Confident. Glamour worn without apology.",
      s: "Vocal house, energetic grooves, female vocals, Italian fashion energy, 122-126 BPM",
      p: "Emerald green, deep red, gold, black",
      cv: "Warmer and more exuberant. Still luxury — but with a smile.",
      model: "Woman, 20-25, extremely beautiful, glamorous, fashion-forward, Italian warmth",
      expression: "Confident, charismatic, enjoying herself — glamour as pleasure not armour",
      lighting: "Rich and warm, slightly theatrical, confident shadows",
      background: "Emerald green or deep red, luxurious and bold, space for expressive typography"
    },
    "Balenciaga": {
      t: "Future luxury",
      a: "Fashion week in 2030. Bold. Electric. Challenges its own category.",
      s: "Tech house, futuristic production, powerful urban energy, 124-128 BPM",
      p: "Black, charcoal, silver, electric blue",
      cv: "Minimal, slightly confrontational. Forward-facing.",
      model: "Woman, 20-25, striking, dramatic, almost otherworldly — powerful rather than conventionally beautiful",
      expression: "Serious, unapproachable, powerful — the future has no time for charm",
      lighting: "Hard, technical, almost clinical — high contrast electric quality",
      background: "Black or deep charcoal, graphic and uncompromising, space for minimal typography"
    },
    "Bottega Veneta": {
      t: "Quiet luxury",
      a: "When your own initials are enough. Private wealth, public restraint.",
      s: "Organic house, luxury lounge, refined deep grooves, understated, 118-122 BPM",
      p: "Olive, forest green, deep chocolate, cream, taupe",
      cv: "Says less than it means. Rewards a second read.",
      model: "European woman, 20-26, beautiful but understated, natural confidence, seems unaware she is being photographed",
      expression: "Natural, self-contained, not performing — simply present",
      lighting: "Natural organic light, slightly diffused, green or golden tones",
      background: "Olive or warm cream, organic and unforced, space for restrained typography"
    },
    "Burberry": {
      t: "British heritage travel",
      a: "First-class rail. Mayfair hotel. Exploration as British tradition.",
      s: "Sophisticated deep house, piano motifs, atmospheric strings, warm pads, 118-122 BPM",
      p: "Camel, stone, beige, forest green, navy",
      cv: "British understatement. Implies far more than it says.",
      model: "British woman, 20-26, exceptionally attractive, refined elegance, independent spirit",
      expression: "Confident, intelligent, quietly adventurous",
      lighting: "Natural British light, slightly overcast quality, atmospheric and real",
      background: "Camel and stone tones, suggest travel without being literal, space for typography"
    },
    "Monvoy": {
      t: "Luxury in motion",
      a: "The moment between destinations. She is not trying to be seen — she is arriving. Those who know, know.",
      s: "Mediterranean organic house, warm bass, elegant female vocals, guitar accents, cinematic atmosphere, 118-122 BPM",
      p: "Mediterranean blue, deep navy, ivory, honey tan, soft gold, stone",
      cv: "Carries the feeling of a place. Makes you want to be somewhere.",
      model: "Mediterranean woman, 20-26, exceptionally beautiful, Monica Bellucci or Eiza Gonzalez register — flawless complexion, striking eyes, natural rather than posed",
      expression: "Natural confidence, mid-arrival — going somewhere, not posing. Not trying to be seen.",
      lighting: "Mediterranean golden hour, warm and cinematic, late afternoon light, soft long shadows",
      background: "Mediterranean blue or deep navy with ivory and honey tones, suggest arrival — harbour light, warm stone, departure — space for elegant typography"
    }
  };

  const p = PROFILES[brand] || {};
  const dur = duration || 2;

  let systemPrompt, userPrompt;

  if (channel === 'inshop' && brand) {
    systemPrompt = `You are the creative director for InShopMusic, an independent luxury ambient music channel. Think like a senior luxury agency creative — not a content tool. InShopMusic is NOT associated with Monvoy publicly.

BRAND: ${brand}
Territory: ${p.t}
Atmosphere: ${p.a}
Music style: ${p.s}
Colour palette: ${p.p}
Caption voice: ${p.cv}
Session duration: ${dur} hours

MODEL & ART DIRECTION:
Model: ${p.model}
Styling provided: ${styling || 'use brand-appropriate styling from your knowledge'}
Expression: ${p.expression}
Lighting: ${p.lighting}
Background: ${p.background}

Monvoy context (outreach brief only): British-German luxury leather goods. Key organisers, glasses cases, luggage tags. Luxury in motion. Carrying with intention. Mediterranean lifestyle. Those who know, know. No products in Monvoy imagery — atmosphere only.

Return ONLY valid JSON, all strings on single lines, no markdown fences:
{"youtube_title":"","youtube_description":"","youtube_tags":"","spotify_description":"","instagram_captions":["","",""],"tiktok_scripts":["",""],"pinterest_pins":["","","","",""],"suno_prompt":"","image_prompt_thumbnail":"","image_prompt_video":"","art_direction":"","track_structure":"","outreach_brief":""}

QUALITY STANDARDS:
youtube_title: BRAND NAME in caps | descriptive keywords | year. Example: HERMES Boutique Music 2026 | Luxury Shopping Ambience | Elegant House Mix
youtube_description: 4-5 sentences. Open atmospherically. List use cases. End with subscribe line.
instagram_captions: Sound like the brand's own creative director. Voice: ${p.cv}. No hashtags. No emoji. Max two sentences. Benchmark: "Timeless elegance never needs to raise its voice."
suno_prompt: Detailed music generation prompt for this brand, session and location. Include BPM, instruments, atmosphere, duration ${dur} hours, no jarring transitions.
image_prompt_thumbnail: Full Midjourney prompt — model, styling, expression, lighting, background per art direction above. Include: large space at top for brand name typography in ${p.p} palette. Ultra realistic, 8K, magazine cover composition.
image_prompt_video: Same scene but clean — no typography space needed, slightly wider crop, the image holds for ${dur} hours of viewing. Ultra realistic, 8K.
art_direction: Readable labelled breakdown — Model | Styling | Expression | Lighting | Background | Palette — each on its own line. Reference document for image generation sessions.
track_structure: Creative direction for ${dur === 1 ? 3 : dur === 3 ? 6 : 5} phases of the ${dur}-hour session. What each phase should feel like emotionally, not just technically. Phase names: ${dur === 1 ? 'Intro / Main Body / Close' : dur === 3 ? 'Intro / Build / Main Body / Sustained / Intimate / Close' : 'Intro / Build / Main Body / Intimate / Close'}.
outreach_brief: Warm message to an established ambient YouTube channel. Propose they produce a Monvoy-branded atmospheric clip in their own style, full credit throughout, fee open. One creative reaching out to another — not a corporate brief.`;

    userPrompt = `Brand: ${brand}
Session: ${session}
Location/atmosphere: ${location || 'brand signature atmosphere'}
Styling: ${styling || 'randomised brand-appropriate'}
Duration: ${dur} hours
Output: ${outputType}`;

  } else {
    systemPrompt = `You are the creative director for Studio Shoot Music, an independent ambient music channel curated for photo shoots, film sets and creative studios. The music is always energetic and forward-moving — slow music kills shoot energy. Long sets, no jarring transitions, nothing that competes with direction on set but always maintaining momentum.

BPM range: 124-130. Never slow. Always driving. Think: busy editorial shoot, fashion week backstage, fast-paced commercial production.

Studio Shoot Music is a professional tool. Write like a working photographer — direct, professional, atmospheric. Monvoy (luxury leather goods) appears naturally in this world — never promoted, simply present.

Session duration: ${dur} hours.

Return ONLY valid JSON, all strings on single lines, no markdown fences:
{"youtube_title":"","youtube_description":"","youtube_tags":"","spotify_description":"","instagram_captions":["",""],"tiktok_scripts":[""],"suno_prompt":"","image_prompt_thumbnail":"","image_prompt_video":"","art_direction":"","track_structure":""}

QUALITY STANDARDS:
youtube_title: Professional, searchable. Include shoot context and year.
youtube_description: Functional and atmospheric. Name use cases. Mention energetic long sets, no jarring transitions.
instagram_captions: Working photographer wrote these. No lifestyle language. Direct, professional.
suno_prompt: Energetic ambient music for creative professionals. 124-130 BPM. Forward momentum throughout. No slow sections. ${dur} hours continuous.
image_prompt_thumbnail: Professional studio or shoot environment. Models or crew at work, natural energy. Clean aesthetic, natural light. Monvoy leather piece present naturally on a surface. Large space for typography. Ultra realistic 8K.
image_prompt_video: Same environment, slightly wider, clean — no typography space. Holds for ${dur} hours of viewing. Ultra realistic 8K.
art_direction: Labelled breakdown — Environment | Lighting | Mood | Props | Colour palette — each on its own line.
track_structure: Creative direction for ${dur === 1 ? 3 : dur === 3 ? 6 : 5} phases keeping energy high throughout. Never lets the room drop.`;

    userPrompt = `Session: ${session}
Mood: ${mood || 'high energy creative environment, editorial shoot day'}
Duration: ${dur} hours
Output: ${outputType}`;
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
        max_tokens: 1800,
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
