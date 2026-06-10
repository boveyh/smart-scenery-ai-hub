const config = require('../config.js');

function createMockStream(onChunk) {
  if (config.USE_MOCK) {
    // 模拟返回两个句子
    setTimeout(() => {
      if (onChunk) onChunk({ seq:1, text_chunk: '这是模拟的第一句。', audio_url: 'https://example.com/mock1.mp3' });
      setTimeout(() => {
        if (onChunk) onChunk({ seq:2, text_chunk: '这是第二句。', audio_url: 'https://example.com/mock2.mp3' });
        if (onChunk) onChunk({ type: 'end', reason: 'complete' });
      }, 500);
    }, 300);
  }
}

module.exports = { createMockStream };