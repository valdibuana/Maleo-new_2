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
    let newContent = content;

    // Backgrounds
    newContent = newContent.replace(/bg-(indigo|emerald|teal|amber|orange|purple|blue)-(50|100)/g, 'bg-brand/10');
    newContent = newContent.replace(/bg-(indigo|emerald|teal|amber|orange|purple|blue)-(400|500|600|700|800|900)/g, 'bg-brand');
    newContent = newContent.replace(/bg-(indigo|emerald|teal|amber|orange|purple|blue)-600\/90/g, 'bg-brand');
    newContent = newContent.replace(/bg-(indigo|emerald|teal|amber|orange|purple|blue)-50\/20/g, 'bg-brand/5');
    newContent = newContent.replace(/bg-(indigo|emerald|teal|amber|orange|purple|blue)-50\/50/g, 'bg-brand/10');
    
    // Text
    newContent = newContent.replace(/text-(indigo|emerald|teal|amber|orange|purple|blue)-(500|600|700|800|900)/g, 'text-brand');
    newContent = newContent.replace(/text-(indigo|emerald|teal|amber|orange|purple|blue)-(50|100|200|300|400)/g, 'text-brand-light');
    
    // Borders
    newContent = newContent.replace(/border-(indigo|emerald|teal|amber|orange|purple|blue)-(100|200|300)/g, 'border-brand/20');
    newContent = newContent.replace(/border-(indigo|emerald|teal|amber|orange|purple|blue)-(400|500|600|700)/g, 'border-brand');
    
    // Gradients
    newContent = newContent.replace(/from-(indigo|emerald|teal|amber|orange|purple|blue)-(400|500|600|700|800)/g, 'from-brand-light');
    newContent = newContent.replace(/to-(indigo|emerald|teal|amber|orange|purple|blue)-(500|600|700|800|900)/g, 'to-brand');
    
    // Ring & Shadow
    newContent = newContent.replace(/ring-(indigo|emerald|teal|amber|orange|purple|blue)-(500|600)/g, 'ring-brand');
    newContent = newContent.replace(/shadow-(indigo|emerald|teal|amber|orange|purple|blue)-(500|600)/g, 'shadow-brand');
    newContent = newContent.replace(/shadow-(indigo|emerald|teal|amber|orange|purple|blue)-(500|600)\/30/g, 'shadow-brand/30');

    // Also Phase 4: Fix Typography text-gray -> text-slate
    newContent = newContent.replace(/text-gray-400/g, 'text-slate-500');
    newContent = newContent.replace(/text-gray-500/g, 'text-slate-600');
    newContent = newContent.replace(/text-gray-600/g, 'text-slate-700');
    newContent = newContent.replace(/text-gray-700/g, 'text-slate-800');
    newContent = newContent.replace(/text-gray-800/g, 'text-slate-900');
    newContent = newContent.replace(/text-gray-900/g, 'text-slate-900');
    newContent = newContent.replace(/bg-gray-50/g, 'bg-slate-50');
    newContent = newContent.replace(/bg-gray-100/g, 'bg-slate-100');
    newContent = newContent.replace(/border-gray-200/g, 'border-slate-200');
    newContent = newContent.replace(/border-gray-300/g, 'border-slate-300');
    
    // Headings tracking-tight and font-bold
    newContent = newContent.replace(/<h1 className="([^"]*)"/g, function(match, classes) {
      if (!classes.includes('tracking-tight')) classes += ' tracking-tight';
      if (!classes.includes('font-bold')) classes += ' font-bold';
      return `<h1 className="${classes}"`;
    });
    newContent = newContent.replace(/<h2 className="([^"]*)"/g, function(match, classes) {
      if (!classes.includes('tracking-tight')) classes += ' tracking-tight';
      if (!classes.includes('font-bold')) classes += ' font-bold';
      return `<h2 className="${classes}"`;
    });
    newContent = newContent.replace(/<h3 className="([^"]*)"/g, function(match, classes) {
      if (!classes.includes('tracking-tight')) classes += ' tracking-tight';
      if (!classes.includes('font-bold')) classes += ' font-bold';
      return `<h3 className="${classes}"`;
    });

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('Updated', filePath);
    }
  }
});
