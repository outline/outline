var fs = require('fs');
var path = require('path');
var mapping = require('emoji-name-map');

fs.writeFile(
  path.join(__dirname, '../frontend/utils/emoji-mapping.json'),
  JSON.stringify(mapping.emoji)
);
