import { mkdirSync, copyFileSync, cpSync } from 'node:fs';
mkdirSync('dist',{recursive:true});
for(const file of ['index.html','design.css','reference.css','refinement.css','overview.css'])copyFileSync(file,'dist/'+file);
cpSync('assets','dist/assets',{recursive:true});
cpSync('canggu','dist/canggu',{recursive:true});

cpSync('archive','dist/archive',{recursive:true});
