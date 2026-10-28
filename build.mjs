import {mkdir,copyFile,readdir} from 'node:fs/promises';
await mkdir(new URL('./dist/',import.meta.url),{recursive:true});
for(const file of await readdir(new URL('./',import.meta.url))){if(file==='index.html'||file==='style.css'||(file.endsWith('.js')&&!file.endsWith('.test.js')))await copyFile(new URL(file,import.meta.url),new URL('dist/'+file,import.meta.url));}
console.log('Birdwire static site prepared.');
