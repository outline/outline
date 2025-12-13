// Mock for franc language detection library
const franc = jest.fn((text) => {
  // Return 'eng' (English) by default, or 'und' (undetermined) for empty text
  if (!text || text.trim().length === 0) {
    return "und";
  }
  return "eng";
});

module.exports = { franc };
