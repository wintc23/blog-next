const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const mod={exports:{}};
new Function('require','module','exports',ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/photo-metadata.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(require,mod,mod.exports);
const {normalizePhotoMetadata:normalize,readPhotoMetadata}=mod.exports;
test('original capture time wins, explicit offsets convert to Beijing across dates',()=>{
 assert.equal(normalize({DateTimeOriginal:'2026:09:18 23:30:00',OffsetTimeOriginal:'-04:00',CreateDate:'2025:01:01 01:00:00'}).takenAt,'2026-09-19T11:30');
 assert.equal(normalize({DateTimeOriginal:'2026-09-18T23:30:00Z'}).takenAt,'2026-09-19T07:30');
 assert.equal(normalize({DateTimeOriginal:'2026:09:19 01:30:00',OffsetTimeOriginal:'+09:00'}).takenAt,'2026-09-19T00:30');
});
test('unknown timezone preserves camera clock and invalid dates never fill a value',()=>{
 const result=normalize({DateTimeOriginal:'2026:09:19 10:15:00'});assert.equal(result.takenAt,'2026-09-19T10:15');assert.match(result.timeNote,/未记录时区/);
 for(const raw of ['2026:02:30 10:00:00','2026:13:01 10:00:00','2026:09:19 24:01:00','not a date'])assert.equal(normalize({DateTimeOriginal:raw}).takenAt,undefined);
 assert.equal(normalize({ModifyDate:'2026:09:19 10:00:00'}).takenAt,undefined);
});
test('GPS respects hemisphere, validates bounds and never invents a place name',()=>{
 const result=normalize({GPSLatitude:[22,30,0],GPSLatitudeRef:'S',GPSLongitude:[114,15,0],GPSLongitudeRef:'W'});
 assert.equal(result.latitude,-22.5);assert.equal(result.longitude,-114.25);assert.equal(result.location,'南纬 22.50000°，西经 114.25000°');
 for(const lat of [[91,0,0],[22,60,0],[NaN,0,0]])assert.equal(normalize({GPSLatitude:lat,GPSLatitudeRef:'N',GPSLongitude:[0,0,0],GPSLongitudeRef:'E'}).location,undefined);
 assert.equal(normalize({GPSLatitude:[0,0,0],GPSLatitudeRef:'N',GPSLongitude:[0,0,0],GPSLongitudeRef:'E'}).latitude,0);
 assert.equal(normalize({City:'深圳市',Location:'梧桐山'}).location,'深圳市 · 梧桐山');
});
test('missing and corrupt metadata never prevent uploading',async()=>{
 assert.deepEqual(await readPhotoMetadata(Buffer.from('not an image')),{});
 assert.deepEqual(normalize({}),{});
});
