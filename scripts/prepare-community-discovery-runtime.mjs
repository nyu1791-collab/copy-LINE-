import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// The production policy now lives in source and is tested before deployment.
// Retain this workflow entry point as an idempotent invariant check.
export function patchCommunityDiscoverySource(input){
 const source=String(input);
 for(const needle of [
  'return {rows,pvpComplete};',
  'const sourcePresent=!!officialIds?.has(id);',
  'const releasePath=releaseEvidenceCurrent&&catalogBacked;',
  'const monthlyLimit=monthlyBoardLimit(candidateMonth);',
  '.sort(byAdditionOrder)',
  'selected&&gradeTopics<monthlyLimit',
 ])if(!source.includes(needle))throw new Error('community discovery policy invariant missing: '+needle);
 return source;
}
async function main(){
 patchCommunityDiscoverySource(await readFile(resolve('scripts/update-community-characters.mjs'),'utf8'));
 console.log('Verified official-source monthly addition-order community discovery policy.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
}
