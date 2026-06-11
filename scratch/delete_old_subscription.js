const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'app', 'subscription', 'page.tsx');
const targetDir = path.join(__dirname, '..', 'app', 'subscription');

try {
  if (fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
    console.log('Successfully deleted page.tsx');
  } else {
    console.log('page.tsx does not exist');
  }

  if (fs.existsSync(targetDir)) {
    fs.rmdirSync(targetDir);
    console.log('Successfully deleted subscription directory');
  } else {
    console.log('subscription directory does not exist');
  }
} catch (error) {
  console.error('Error during deletion:', error);
}
