const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/screens');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern: Alert.alert('Succès', '...'); navigation.replace('Route', {...});
  // Or navigation.goBack();
  const patternReplace = /Alert\.alert\('Succès',\s*('[^']+')\);\s*navigation\.replace\(([^)]+)\);/g;
  if (patternReplace.test(content)) {
    content = content.replace(patternReplace, "Alert.alert('Succès', $1, [{ text: 'OK', onPress: () => navigation.replace($2) }]);");
    modified = true;
  }

  const patternGoBack = /Alert\.alert\('Succès',\s*('[^']+')\);\s*navigation\.goBack\(\);/g;
  if (patternGoBack.test(content)) {
    content = content.replace(patternGoBack, "Alert.alert('Succès', $1, [{ text: 'OK', onPress: () => navigation.goBack() }]);");
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed Alert navigation in ${file}`);
  }
}
