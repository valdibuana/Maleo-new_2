const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('d:/0- Projek Maleo/web_siakad/web/src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // global replace
    let newContent = content.replace(/Siswa/g, 'Murid').replace(/siswa/g, 'murid');
    
    // ConnectSidebar specifics
    if (filePath.includes('ConnectSidebar.tsx') || filePath.includes('layout.tsx')) {
      newContent = newContent.replace('"Data Anak"', '"Data Murid (Anak)"');
    }
    
    // Students page header
    if (filePath.replace(/\\/g, '/').includes('src/app/(admin)/students/page.tsx')) {
      newContent = newContent.replace('<h1 className="text-2xl font-bold text-foreground">Data Murid</h1>', '<h1 className="text-2xl font-bold text-foreground">Manajemen Data Murid</h1>');
    }

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
