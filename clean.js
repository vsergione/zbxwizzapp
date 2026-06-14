const fs = require('fs');

const REMOVE_KEYS = [
  'sysmapusrgrpid',
  'sysmapid',
  'selementid',
  'sysmap_shapeid',
  'userid'
];

function removeKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(removeKeys);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([key]) => !REMOVE_KEYS.includes(key))
        .map(([key, value]) => [key, removeKeys(value)])
    );
  }
  return obj;
}

// Load your JSON file
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

// Remove unwanted keys
const cleaned = removeKeys(data);

// Save the cleaned JSON
fs.writeFileSync('data.cleaned.json', JSON.stringify(cleaned, null, 2));