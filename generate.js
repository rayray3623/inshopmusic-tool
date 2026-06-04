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

  async function callAPI(system, user) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system,
        messages: [{ role: 'user', content: user }]
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `API error ${response.status}`);
    const raw = data.content.map(i => i.text || '').join('');
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s === -1 || e === -1) throw new Error('No JSON in response');
    return JSON.parse(raw.slice(s, e + 1));
  }

  try {
    let result = {};

    if (channel === 'inshop' && brand) {
      const baseContext = `BRAND: ${brand}
Territory: ${p.t}
Atmosphere: ${p.a}
Music style: ${p.s}
Colour palette: ${p.p}
Caption voice: ${p.cv}
Duration: ${dur} hours
Model: ${p.model}
Styling: ${styling || 'brand-appropriate'}
Expression: ${p.expression}
Lighting: ${p.lighting}
Background: ${p.background}
Location: ${location || 'brand signature atmosphere'}`;

      const needsProduction = outputType === 'full' || outputType === 'production';
      const needsSocial = outputType === 'full' || outputType === 'social';
      const needsOutreach = outputType === 'full' || outputType === 'outreach';

      if (needsProduction) {
        const prodSystem = `You are the creative director for InShopMusic, a luxury ambient music channel. Think like a senior luxury agency creative.

${baseContext}

Return ONLY valid JSON, single line strings, no markdown:
{"image_prompt_thumbnail":"","image_prompt_video":"","art_direction":"","suno_prompt":"","track_structure":""}

image_prompt_thumbnail: Detailed Midjourney prompt. Model per description above wearing the provided styling. Expression per above. Lighting per above. Background in ${p.p} palette with large space at top for brand name typography. Ultra realistic, 8K, magazine cover composition.
image_prompt_video: Same scene, slightly wider, no typography space needed, clean for ${dur} hour viewing. Ultra realistic 8K.
art_direction: Labelled lines — Model | Styling | Expression | Lighting | Background | Palette
suno_prompt: Music generation prompt with BPM, instruments, atmosphere, ${dur} hours, no jarring transitions.
track_structure: Creative direction for ${dur === 1 ? 3 : dur === 3 ? 6 : 5} phases (${dur === 1 ? 'Intro / Main Body / Close' : dur === 3 ? 'Intro / Build / Main Body / Sustained / Intimate / Close' : 'Intro / Build / Main Body / Intimate / Close'}). What each phase feels like emotionally.`;

        const prodResult = await callAPI(prodSystem, `Brand: ${brand}, Session: ${session}, Location: ${location || 'brand atmosphere'}, Styling: ${styling || 'brand-appropriate'}, Duration: ${dur}h`);
        result = { ...result, ...prodResult };
      }

      if (needsSocial) {
        const socialSystem = `You are the creative director for InShopMusic, a luxury ambient music channel. Think like a senior luxury agency creative. InShopMusic is NOT associated with Monvoy.

${baseContext}

Return ONLY valid JSON, single line strings, no markdown:
{"youtube_title":"","youtube_description":"","youtube_tags":"","spotify_description":"","instagram_captions":["","",""],"tiktok_scripts":["",""],"pinterest_pins":["","","","",""]}

youtube_title: BRAND NAME in caps | descriptive keywords | year. Example: HERMES Boutique Music 2026 | Luxury Shopping Ambience | Elegant House Mix
youtube_description: 4-5 sentences. Open atmospherically. List use cases (luxury retail, boutiques, hotel lounges, work, study). Subscribe line at end.
instagram_captions: 3 variants. Voice: ${p.cv}. No hashtags, no emoji, max 2 sentences each. Sound like the brand's own creative director. Benchmark: "Timeless elegance never needs to raise its voice."
spotify_description: 2-3 sentences, atmospheric, passive listening tone.
tiktok_scripts: 2 short scripts, 30-45 seconds, scene-setting, atmospheric, no hard sell.
pinterest_pins: 5 pin descriptions targeting luxury lifestyle search terms.`;

        const socialResult = await callAPI(socialSystem, `Brand: ${brand}, Session: ${session}, Location: ${location || 'brand atmosphere'}`);
        result = { ...result, ...socialResult };
      }

      if (needsOutreach) {
        const outreachSystem = `You are writing on behalf of Monvoy, a British-German luxury leather goods brand. Key organisers, glasses cases, luggage tags. Luxury in motion. Carrying with intention. Mediterranean lifestyle. Those who know, know.

Return ONLY valid JSON, single line strings, no markdown:
{"outreach_brief":""}

outreach_brief: A warm message to an established ambient YouTube channel proposing they produce a Monvoy-branded atmospheric clip in their own style. Their full production credit throughout. Fee open. One creative reaching out to another — not a corporate brief. 150-200 words.`;

        const outreachResult = await callAPI(outreachSystem, `Channel style: ${brand}-adjacent luxury ambient. Session context: ${session}`);
        result = { ...result, ...outreachResult };
      }

    } else {
      const needsProduction = outputType === 'full' || outputType === 'production';
      const needsSocial = outputType === 'full' || outputType === 'social';

      if (needsProduction) {
        const prodSystem = `You are the creative director for Studio Shoot Music, ambient music for photo shoots and film sets. Always energetic, 124-130 BPM, forward momentum, never slow. ${dur} hours.

Return ONLY valid JSON, single line strings, no markdown:
{"image_prompt_thumbnail":"","image_prompt_video":"","art_direction":"","suno_prompt":"","track_structure":""}

image_prompt_thumbnail: Professional studio or shoot environment. Crew at work, natural energy. Clean aesthetic, natural light. Monvoy leather piece on a surface naturally. Large typography space. Ultra realistic 8K.
image_prompt_video: Same, slightly wider, no typography space, holds for ${dur} hours. Ultra realistic 8K.
art_direction: Labelled lines — Environment | Lighting | Mood | Props | Colour palette
suno_prompt: Energetic creative professional ambient. 124-130 BPM. No slow sections. ${dur} hours continuous.
track_structure: ${dur === 1 ? 3 : dur === 3 ? 6 : 5} phases keeping energy high throughout. Never lets the room drop.`;

        const prodResult = await callAPI(prodSystem, `Session: ${session}, Mood: ${mood || 'high energy editorial shoot'}, Duration: ${dur}h`);
        result = { ...result, ...prodResult };
      }

      if (needsSocial) {
        const socialSystem = `You are the creative director for Studio Shoot Music, ambient music for photo shoots and film sets. Write like a working photographer — direct, professional. Monvoy appears naturally, never promoted.

Return ONLY valid JSON, single line strings, no markdown:
{"youtube_title":"","youtube_description":"","youtube_tags":"","spotify_description":"","instagram_captions":["",""],"tiktok_scripts":[""]}

youtube_title: Professional, searchable, shoot context, year.
youtube_description: Functional and atmospheric. Use cases. Energetic long sets, no jarring transitions.
instagram_captions: 2 variants. Working photographer voice. Direct, professional, no lifestyle language.
spotify_description: 2 sentences, functional and atmospheric.
tiktok_scripts: 1 short script, studio environment, 30 seconds.`;

        const socialResult = await callAPI(socialSystem, `Session: ${session}, Mood: ${mood || 'high energy editorial shoot'}`);
        result = { ...result, ...socialResult };
      }
    }

   return { statusCode: 200, headers, body: JSON.stringify({ result }) };

  } catch(err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
