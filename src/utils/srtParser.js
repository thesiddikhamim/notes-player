export function parseSRT(data) {
  if (!data) return [];

  const isVTT = data.trim().startsWith('WEBVTT');
  
  // Remove WEBVTT header if present
  let text = data;
  if (isVTT) {
    text = text.replace(/^WEBVTT.*\n?/m, '').trim();
  }

  // Split by double newline (handles \n\n or \r\n\r\n)
  const blocks = text.split(/\n\s*\n/);
  const cues = [];
  let idBase = 1;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeString = '';
    let textLines = [];
    let id = String(idBase++);

    if (lines[0].includes('-->')) {
      timeString = lines[0];
      textLines = lines.slice(1);
      // id remains default
    } else if (lines.length >= 3 && lines[1].includes('-->')) {
      id = lines[0].trim();
      timeString = lines[1];
      textLines = lines.slice(2);
    } else {
      continue;
    }

    const [startStr, endStr] = timeString.split(/\s*-->\s*/);
    if (!startStr || !endStr) continue;

    const start = parseTime(startStr);
    const end = parseTime(endStr);
    
    // Remove VTT tags like <v Speaker> or <i>
    let cleanText = textLines.join('\n').replace(/<[^>]+>/g, '');

    cues.push({
      id,
      start,
      end,
      text: cleanText,
    });
  }

  return cues;
}

function parseTime(timeStr) {
  // 00:00:00.000 or 00:00:00,000 or 00:00.000
  const match = timeStr.match(/(?:(\d+):)?(\d+):(\d+)[.,](\d+)/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const milliseconds = parseInt(match[4], 10);

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}
