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
    "Chanel": {
      t: "Parisian elegance",
      a: "Avenue Montaigne. Effortless French grace. She doesn't need to be noticed.",
      s: "Elegant vocal house, piano stabs, French influences, 120 BPM",
      p: "Cream, blush pink, ivory, black accents",
      cv: "Spare, poetic, Parisian. Implies more than it says.",
      model: "French woman, blonde or soft brunette, 22-28, refined beauty, soft femininity, graceful rather than overtly sexy",
      styling: "Tweed jacket or silk blouse, pearl or gold chain details, understated jewellery",
      expression: "Calm, composed, slightly distant — she is not performing for the camera",
      lighting: "Soft diffused studio light, warm and even, no harsh shadows",
      background: "Clean cream or pale grey studio, generous empty space for typography overlay"
    },
    "Prada": {
      t: "Intellectual fashion",
      a: "Milan. Architectural luxury. Intelligence as aesthetic.",
      s: "Minimal deep house, sparse vocals, dark bass, 122 BPM",
      p: "Burgundy, black, white",
      cv: "Precise, minimal, slightly cold. One sentence that makes you think.",
      model: "Italian woman, dark hair, 24-32, strong features, intelligent expression, slightly aloof editorial beauty",
      styling: "Minimal tailoring, sharp silhouettes, nothing decorative — structure is the statement",
      expression: "Direct, unreadable, confident — she is the architecture",
      lighting: "High contrast, clean shadows, architectural light",
      background: "Stark white or deep burgundy, minimal, space for bold typography"
    },
    "Hermes": {
      t: "Heritage luxury",
      a: "Quiet confidence. Expensive without trying. Craftsmanship self-evident.",
      s: "Organic house, acoustic textures, warm bass, 118 BPM",
      p: "Cognac, orange, cream",
      cv: "Unhurried, wise. Like something a grandmother who wore Hermes would say.",
      model: "European woman, 28-38, timeless beauty, mature sophistication, natural elegance — not fashion, simply herself",
      styling: "Cashmere or fine silk, equestrian hints, understated jewellery, nothing trend-led",
      expression: "Warm but self-contained, unhurried, at ease with herself",
      lighting: "Warm golden hour quality, natural and flattering, soft shadows",
      background: "Warm cream or cognac tones, soft and uncluttered, space for refined typography"
    },
    "Dior": {
      t: "Couture glamour",
      a: "Paris Fashion Week. Glamour with gravity. Couture as architecture.",
      s: "Runway house, female vocal chops, bright synths, 124 BPM",
      p: "Grey, white, silver",
      cv: "Romantic but measured. Opens a fashion editorial.",
      model: "Parisian woman, 22-30, couture beauty, sophisticated glamour, flawless complexion",
      styling: "Couture silhouettes, elegant tailoring, refined evening glamour",
      expression: "Assured, romantic, aware of her effect — glamour worn with gravity",
      lighting: "Soft glamour lighting, slight luminosity, flattering and cinematic",
      background: "Pale grey or silver-white, clean and elegant, space for Dior-style typography"
    },
    "Armani": {
      t: "Effortless sophistication",
      a: "Luxury hotel lobby. Italian ease. Power worn lightly.",
      s: "Lounge house, smooth keys, warm bass, 120 BPM",
      p: "Greige, navy, charcoal",
      cv: "Quiet authority. A well-dressed man of 50 without looking up.",
      model: "Mediterranean woman or man, 30-45, sophisticated, understated, relaxed authority",
      styling: "Impeccable tailoring worn loosely, relaxed luxury, nothing stiff",
      expression: "Effortless, unhurried, the room adjusts to them not the reverse",
      lighting: "Warm, even, luxurious — hotel lobby quality light",
      background: "Greige or warm charcoal, uncluttered, space for clean typography"
    },
    "Saint Laurent": {
      t: "Night-time glamour",
      a: "Paris after dark. Confidence as currency. The boutique stays open late.",
      s: "Dark house, moody synths, sparse vocals, 124 BPM",
      p: "Black, gold",
      cv: "One line with an edge. Certain, not aggressive.",
      model: "Woman, 22-32, dramatic beauty, strong features, high confidence, striking rather than merely pretty",
      styling: "Sharp tailoring, evening glamour, black dominant, gold accents",
      expression: "Owns the room. Not aggressive — simply certain.",
      lighting: "Low key, dramatic shadows, evening quality, pools of warm light",
      background: "Deep black or near-black, gold accent tones, space for bold typography"
    },
    "Louis Vuitton": {
      t: "Travel luxury",
      a: "Airport lounge meets flagship. Movement as identity.",
      s: "Travel house, airy pads, global influences, 122 BPM",
      p: "Camel, brown, cream",
      cv: "Suggests movement. The feeling of a departure gate at a good airport.",
      model: "Woman, 25-40, worldly, sophisticated, cultured — she has been somewhere extraordinary and is about to leave again",
      styling: "Tailored coat, travel luxury, cashmere, elegant luggage nearby",
      expression: "Curious, confident, mid-journey — between arrivals",
      lighting: "Clean bright natural light, airport lounge or hotel lobby quality",
      background: "Warm camel and cream tones, travel context suggested, space for typography"
    },
    "Gucci": {
      t: "Fashion glamour",
      a: "Milan. Confident. Glamour worn without apology.",
      s: "Vocal house, energetic grooves, female vocals, 124 BPM",
      p: "Emerald green, deep red, gold, black",
      cv: "Warmer and more exuberant. Still luxury — but with a smile.",
      model: "Woman, 22-30, extremely beautiful, glamorous, fashion-forward, Italian warmth",
      styling: "Statement fashion, luxury glamour, colour and personality — Gucci wears you as much as you wear it",
      expression: "Confident, charismatic, enjoying herself — glamour as pleasure not armour",
      lighting: "Rich and warm, slightly theatrical, confident shadows",
      background: "Emerald green or deep red, luxurious and bold, space for expressive typography"
    },
    "Balenciaga": {
      t: "Future luxury",
      a: "Fashion week in 2030. Bold. Electric. Challenges its own category.",
      s: "Tech house, futuristic production, powerful energy, 126 BPM",
      p: "Black, charcoal, silver, electric blue",
      cv: "Minimal, slightly confrontational. Forward-facing.",
      model: "Woman or man, 20-30, striking, dramatic, almost otherworldly — not beautiful in a conventional sense, powerful",
      styling: "Oversized or avant-garde silhouettes, futuristic fashion, nothing nostalgic",
      expression: "Serious, unapproachable, powerful — the future has no time for charm",
      lighting: "Hard, technical, almost clinical — high contrast electric quality",
      background: "Black or deep charcoal, graphic and uncompromising, space for minimal typography"
    },
    "Bottega Veneta": {
      t: "Quiet luxury",
      a: "When your own initials are enough. Private wealth, public restraint.",
      s: "Organic house, refined deep grooves, understated, 120 BPM",
      p: "Olive, forest green, deep chocolate, cream, taupe",
      cv: "Says less than it means. Rewards a second read.",
      model: "European woman, 24-34, beautiful but understated, natural confidence, she seems unaware she is being photographed",
      styling: "Quiet luxury tailoring, knitwear, cashmere, nothing with a logo — the quality speaks",
      expression: "Natural, self-contained, not performing — simply present",
      lighting: "Natural, organic light, slightly diffused, green or golden tones",
      background: "Olive or warm cream, organic and unforced, space for restrained typography"
    },
    "Burberry": {
      t: "British heritage travel",
      a: "First-class rail. Mayfair hotel. Exploration as British tradition.",
      s: "Sophisticated deep house, piano motifs, atmospheric strings, 120 BPM",
      p: "Camel, stone, beige, forest green, navy",
      cv: "British understatement. Implies far more than it says.",
      model: "British woman, 23-32, exceptionally attractive, refined elegance, independent spirit — she has just returned from somewhere interesting",
      styling: "Trench coat, tailored wool, cashmere scarf, riding boots — heritage without costume",
      expression: "Confident, intelligent, quietly adventurous",
      lighting: "Natural British light, slightly overcast quality, atmospheric and real",
      background: "Camel and stone tones, suggest travel or countryside without being literal, space for typography"
    },
    "Monvoy": {
      t: "Luxury in motion",
      a: "The moment between destinations. She is not trying to be seen — she is arriving. Those who know, know.",
      s: "Mediterranean organic house, warm bass, female vocals, guitar accents, cinematic, 120 BPM",
      p: "Mediterranean blue, deep navy, ivory, honey tan, soft gold, stone",
      cv: "Carries the feeling of a place. Makes you want to be somewhere.",
      model: "Mediterranean woman, 22-30, exceptionally beautiful, Monica Bellucci or Eiza Gonzalez register — flawless complexion, striking eyes, natural rather than posed beauty",
      styling: "Luxury tailoring or silk, minimal jewellery, a Monvoy leather piece nearby as companion not prop — key organiser, glasses case or luggage tag placed naturally",
      expression: "Natural confidence, mid-arrival — she is going somewhere, not posing. Not trying to be seen.",
      lighting: "Mediterranean golden hour, warm and cinematic, late afternoon light, soft long shadows",
      background: "Mediterranean blue or deep navy, ivory and honey tones, suggest arrival — harbour, hotel, departure — space for elegant typography"
    }
  };

  const p = PROFILES[brand] || {};

  let systemPrompt, userPrompt;

  if (channel === 'inshop' && brand) {
    systemPrompt = `You are the creative director for InShopMusic, an independent luxury ambient music channel. Think like a senior luxury agency creative — not a content tool. InShopMusic is NOT associated with Monvoy publicly.

BRAND: ${brand}
Territory: ${p.t}
Atmosphere: ${p.a}
Music style: ${p.s}
Colour palette: ${p.p}
Caption voice: ${p.cv}

Monvoy context (outreach brief only): British-German luxury leather goods. Key organisers, glasses cases, luggage tags. Luxury in motion. Carrying with intention. Mediterranean lifestyle. Those who know, know.

ART DIRECTION FOR THIS BRAND:
Model: ${p.model}
Styling: ${p.styling}
Expression: ${p.expression}
Lighting: ${p.lighting}
Background: ${p.background}

Return ONLY valid JSON, all strings on single lines, no markdown fences:
{"youtube_title":"","youtube_description":"","youtube_tags":"","spotify_description":"","instagram_captions":["","",""],"tiktok_scripts":["",""],"pinterest_pins":["","","","",""],"suno_prompt":"","image_prompt":"","art_direction":"","track_structure":"","outreach_brief":""}

QUALITY STANDARDS:
- youtube_title: BRAND NAME in caps | descriptive keywords | year. Example: HERMES Boutique Music 2026 | Luxury Shopping Ambience | Elegant House Mix
- youtube_description: 4-5 sentences. Open atmospherically, then list use cases (luxury retail, boutiques, hotel lounges, work, study). End with subscribe line.
- instagram_captions: Each must sound like the brand's own creative director. Caption voice: ${p.cv}. No hashtags. No emoji. Maximum two sentences. Quality benchmark: "Timeless elegance never needs to raise its voice."
- suno_prompt: Detailed music generation prompt expanding on the brand music style for this specific session and location
- image_prompt: Full Midjourney/Ideogram prompt incorporating all art direction elements above — model, styling, expression, lighting, background, typography space. Ultra realistic, 8K, magazine cover quality.
- art_direction: Separate readable breakdown — Model, Styling, Expression, Lighting, Background, Colour palette — each on its own labelled line for easy reference when generating images
- track_structure: Creative direction for 5 phases of 2-hour session. Phase 1 Intro, Phase 2 Build, Phase 3 Main Body, Phase 4 Intimate, Phase 5 Close. What should each phase feel like, not just technical notes.
- outreach_brief: Warm message to an established ambient YouTube channel. Propose they produce a Monvoy-branded clip in their own style, their credit throughout, fee open. One creative reaching out to another.`;

    userPrompt = `Brand: ${brand}
Session: ${session}
Location/atmosphere: ${location || 'use brand signature atmosphere'}
Output type: ${outputType}

Generate the complete content package. Prioritise creative quality — especially instagram captions, art direction and track structure.`;

  } else {
    systemPrompt = `You are the creative director for Studio Shoot Music, an independent ambient music channel curated specifically for photo shoots, film sets, creative studios and production environments. Long sets, no jarring transitions, nothing that competes with direction on set.

Studio Shoot Music is a professional tool, not a lifestyle channel. Write like a working photographer or creative director — direct, professional, with an eye for atmosphere.

Monvoy (luxury leather goods — key organisers, glasses cases, luggage tags) appears naturally as a brand that belongs in this creative professional world. Never promoted, simply present.

Return ONLY valid JSON, all strings on single lines, no markdown fences:
{"youtube_title":"","youtube_description":"","youtube_tags":"","spotify_description":"","instagram_captions":["",""],"tiktok_scripts":[""],"suno_prompt":"","image_prompt":"","art_direction":"","track_structure":""}

QUALITY STANDARDS:
- youtube_title: Descriptive, professional, searchable. Include shoot context and year.
- youtube_description: Functional and atmospheric. Name the use cases: photo shoots, film sets, creative studios. Mention long sets and no jarring transitions — that's what this audience needs to hear.
- instagram_captions: Sound like a working photographer wrote them. No lifestyle language. Direct, professional, atmospheric.
- suno_prompt: Long-form ambient music suitable for sustained creative work. No jarring transitions, steady energy, professional studio atmosphere.
- image_prompt: Professional studio or shoot environment. Natural light, clean aesthetic, Monvoy leather piece present naturally. Ultra realistic, 8K.
- art_direction: Labelled breakdown — Environment, Lighting, Mood, Props, Colour palette — for image generation reference.
- track_structure: Creative direction for 5 phases of a long session (Opening / Settling / Deep Focus / Mid-session energy / Close of day).`;

    userPrompt = `Session: ${session}
Mood/atmosphere: ${mood || 'calm focus, morning light, professional creative environment'}
Output type: ${outputType}`;
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
