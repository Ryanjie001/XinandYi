import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
const release=process.argv[2];
assert.match(release,/^\/srv\/xinanyi\/releases\/[0-9TZ]+$/);
const require=createRequire(path.join(release,"package.json"));
const mysql=require("mysql2/promise"),COS=require("cos-nodejs-sdk-v5");
const env=Object.fromEntries(fs.readFileSync("/etc/xinanyi/app.env","utf8").trim().split("\n").map(line=>{const i=line.indexOf("=");return [line.slice(0,i),JSON.parse(line.slice(i+1))];}));
assert.equal(env.DATABASE_ENV,"production");assert.equal(env.COS_PREFIX,"xinanyi/production");
const targetUri=new URL(env.DATABASE_URL);assert.equal(targetUri.pathname,"/xinanyi_prod");
const marker="/opt/xinanyi/server/production-bootstrap.json";
const tables=["app_user","auth_account","photo","wish","memory","memory_photo","couple_settings","import_batch"];
const hash=data=>createHash("sha256").update(data).digest("hex");
const publicGrants=acl=>(acl.Grants||[]).filter(g=>/AllUsers|AuthenticatedUsers/i.test(JSON.stringify(g.Grantee||{}))).length;
let source,target;
try{
 target=await mysql.createConnection({host:targetUri.hostname,port:Number(targetUri.port),user:decodeURIComponent(targetUri.username),password:decodeURIComponent(targetUri.password),database:"xinanyi_prod",timezone:"Z",charset:"utf8mb4"});
 if(fs.existsSync(marker)){
  const previous=JSON.parse(fs.readFileSync(marker,"utf8"));
  assert.equal(previous.status,"complete","Previous bootstrap needs manual review.");
  console.log(JSON.stringify({productionBootstrap:"already-completed",counts:previous.counts}));process.exitCode=0;
 }else{
  for(const table of tables){
   const [[r]]=await target.query("SELECT COUNT(*) AS total FROM `"+table+"`");
   assert.equal(r.total,0,"Production database is not empty; refusing to overwrite it.");
  }
  source=await mysql.createConnection({host:"127.0.0.1",port:3306,user:"xinanyi_dev_app",password:fs.readFileSync("/opt/xinanyi/secrets/mysql-dev-app","utf8").trim(),database:"xinanyi_dev",timezone:"Z",charset:"utf8mb4"});
  await source.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
  await source.beginTransaction();
  const rows={};
  for(const table of tables){const [data]=await source.query("SELECT * FROM `"+table+"`");rows[table]=data;}
  await source.commit();
  assert.deepEqual(rows.app_user.map(x=>x.id).sort(),["xin","yi"]);
  const referenced=new Set(rows.memory_photo.map(x=>x.photoId));
  for(const s of rows.couple_settings)if(s.coverPhotoId)referenced.add(s.coverPhotoId);
  rows.photo=rows.photo.filter(p=>referenced.has(p.id));
  const cos=new COS({SecretId:env.COS_SECRET_ID,SecretKey:env.COS_SECRET_KEY,Timeout:30000});
  const Bucket=env.COS_BUCKET,Region=env.COS_REGION;
  assert.equal(publicGrants(await cos.getBucketAcl({Bucket,Region})),0);
  for(let index=0;index<rows.photo.length;index++){
   const photo=rows.photo[index];
   assert.equal(photo.bucket,Bucket);assert.equal(photo.region,Region);
   assert.ok(photo.objectKey.startsWith("xinanyi/development/photos/"));
   const sourceKey=photo.objectKey,newKey=sourceKey.replace("xinanyi/development/","xinanyi/production/");
   await cos.putObjectCopy({Bucket,Region,Key:newKey,CopySource:Bucket+".cos."+Region+".myqcloud.com/"+sourceKey.split("/").map(encodeURIComponent).join("/"),ACL:"private"});
   assert.equal(publicGrants(await cos.getObjectAcl({Bucket,Region,Key:newKey})),0);
   const signed=Key=>cos.getObjectUrl({Bucket,Region,Key,Sign:true,Expires:60,Protocol:"https:"});
   const newUrl=signed(newKey);
   const [a,b]=await Promise.all([fetch(signed(sourceKey)),fetch(newUrl)]);
   assert.equal(a.status,200);assert.equal(b.status,200);
   const oldBytes=Buffer.from(await a.arrayBuffer()),newBytes=Buffer.from(await b.arrayBuffer());
   assert.equal(hash(oldBytes),hash(newBytes));assert.equal(newBytes.length,photo.bytes);
   assert.equal((await fetch(newUrl.split("?")[0])).status,403);
   photo.objectKey=newKey;
   console.log("Production photo "+(index+1)+"/"+rows.photo.length+" copied and verified private.");
  }
  await target.beginTransaction();
  try{
   for(const table of tables){
    for(const row of rows[table]){
     const columns=Object.keys(row),values=columns.map(k=>{if(k!=="images")return row[k];const images=typeof row[k]==="string"?JSON.parse(row[k]):row[k];assert.ok(Array.isArray(images));return JSON.stringify(images);});
     await target.execute("INSERT INTO `"+table+"` ("+columns.map(k=>"`"+k+"`").join(",")+") VALUES ("+columns.map(()=>"?").join(",")+")",values);
    }
   }
   await target.commit();
  }catch(error){await target.rollback();throw error;}
  const counts={};
  for(const table of tables){
   const [[r]]=await target.query("SELECT COUNT(*) AS total FROM `"+table+"`");
   assert.equal(r.total,rows[table].length);counts[table]=r.total;
  }
  const [[sessions]]=await target.query("SELECT COUNT(*) AS total FROM auth_session");
  assert.equal(sessions.total,0,"Development sessions must not be copied.");
  const result={status:"complete",importedAt:new Date().toISOString(),source:"xinanyi_dev",target:"xinanyi_prod",photosPrefix:env.COS_PREFIX,counts};
  fs.writeFileSync(marker,JSON.stringify(result,null,2),{mode:0o600});
  console.log(JSON.stringify(result));
 }
}catch(error){console.error("Production initialization failed:",error.code||error.name);process.exitCode=1;}
finally{if(source)await source.end();if(target)await target.end();}
