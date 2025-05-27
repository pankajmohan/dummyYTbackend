import fs from 'fs';
import mediainfo from 'mediainfo.js';


const getVideoDuration = async (filePath) => {
  try {
    const mediaInfo = await mediainfo();
    const data = fs.readFileSync(filePath);
    const getSize = () => data.length;
    const readChunk = (chunkSize, offset) =>
      Promise.resolve(data.slice(offset, offset + chunkSize));
    const result = await mediaInfo.analyzeData(getSize, readChunk);
    const generalTrack = result.media.track.find(t => t['@type'] === 'General');

    if (!generalTrack || !generalTrack.Duration) {
      throw new Error('Duration not found');
    }

    const durationSeconds = parseFloat(generalTrack.Duration); // assuming duration is in seconds
    const mins = Math.floor(durationSeconds / 60);
    const secs = Math.floor(durationSeconds % 60);

    // Pad seconds with 0 if < 10 to keep format like 1.02, not 1.2
    const formatted = parseFloat(`${mins}.${secs < 10 ? '0' : ''}${secs}`);

    console.log(`Formatted duration: ${formatted}`); // Example: 1.02

    return formatted;
  } catch (err) {
    console.error('Error getting video duration:', err.message);
    return null;
  }
};



export default getVideoDuration;
