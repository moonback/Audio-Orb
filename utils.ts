/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {Blob} from '@google/genai';

function encode(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // convert float32 -1 to 1 to int16 -32768 to 32767
    int16[i] = data[i] * 32768;
  }

  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const buffer = ctx.createBuffer(
    numChannels,
    data.length / 2 / numChannels,
    sampleRate,
  );

  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
  const l = dataInt16.length;
  const dataFloat32 = new Float32Array(l);
  
  // Convert PCM16 to Float32 with proper normalization
  for (let i = 0; i < l; i++) {
    // Clamp to prevent overflow and normalize
    const sample = Math.max(-32768, Math.min(32767, dataInt16[i]));
    dataFloat32[i] = sample / 32768.0;
  }
  
  // Handle mono audio (most common case)
  if (numChannels === 1) {
    buffer.copyToChannel(dataFloat32, 0);
  } else if (numChannels > 1) {
    // Extract interleaved channels for stereo/multi-channel
    for (let i = 0; i < numChannels; i++) {
      const channelData = new Float32Array(l / numChannels);
      for (let j = 0; j < channelData.length; j++) {
        channelData[j] = dataFloat32[j * numChannels + i];
      }
      buffer.copyToChannel(channelData, i);
    }
  } else {
    // Fallback: treat as mono
    buffer.copyToChannel(dataFloat32, 0);
  }

  return buffer;
}

export {createBlob, decode, decodeAudioData, encode};
