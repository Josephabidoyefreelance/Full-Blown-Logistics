const fs=require('fs'),path=require('path'),crypto=require('crypto');
const files=require('./checks/source-hashes.json');
const project=process.argv[2]; const mode=process.argv[3];
if (!project || !['--dry-run','--install'].includes(mode)) {
  console.error('Usage: node INSTALL.js "C:\\path\\to\\jaad-backend" --dry-run|--install');process.exit(2);
}
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const status=[];let blocked=false;
for (const [rel, hashes] of Object.entries(files)) {
  const dst=path.join(project,...rel.split('/')),src=path.join(__dirname,...rel.split('/'));
  const actual=fs.existsSync(dst)?sha(dst):null;
  const desired=sha(src);
  const state=desired!==hashes.after_sha256?'PACKAGE-CORRUPT':actual===hashes.before_sha256?'READY':actual===hashes.after_sha256?'ALREADY-INSTALLED':'SOURCE-MISMATCH';
  if (!['READY','ALREADY-INSTALLED'].includes(state))blocked=true;
  status.push({rel,src,dst,state});console.log(rel+': '+state);
}
if(blocked){console.error('STOP: no files changed. Newer/different source must be reviewed before replacement.');process.exit(1);}
if(mode==='--dry-run'){console.log('DRY RUN ONLY.');process.exit(0);}
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backupRoot=path.join(project,'.jaad-tenant-isolation-backups',stamp);
const pending=status.filter(x=>x.state==='READY');
try {
  for(const x of pending){
    const save=path.join(backupRoot,...x.rel.split('/'));fs.mkdirSync(path.dirname(save),{recursive:true});fs.copyFileSync(x.dst,save);
  }
  for(const x of pending){fs.copyFileSync(x.src,x.dst);console.log('Installed: '+x.rel)}
  console.log('Applied '+pending.length+' files. Backup directory: '+backupRoot);
} catch(e) {
  for(const x of pending){const save=path.join(backupRoot,...x.rel.split('/'));if(fs.existsSync(save)){fs.copyFileSync(save,x.dst)}}
  console.error('Installation failed. Available file backups restored. '+e.message);process.exit(1);
}
