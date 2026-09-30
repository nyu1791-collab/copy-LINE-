import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {patchCommunityDiscoverySource} from '../scripts/prepare-community-discovery-runtime.mjs';

test('scheduled discovery patches the current last-day release-month implementation',async()=>{
 const source=await readFile(new URL('../scripts/update-community-characters.mjs',import.meta.url),'utf8');
 const patched=patchCommunityDiscoverySource(source);
 assert.match(patched,/const \{rows,pvpComplete\}=currentRows\(currentSnapshot\)/);
 assert.match(patched,/const releaseMonth=communityReleaseMonthJST\(updatedAt\)/);
 assert.match(patched,/const sourcePresent=!!officialIds\?\.has\(id\)/);
 assert.match(patched,/const officialObservation=eligible&&imageVerified&&!!officialIds\?\.has\(id\)&&\(!releaseEvidence\|\|releaseEvidenceCurrent\)/);
});

test('automatic promotion requires both official notice evidence and catalog membership',async()=>{
 const source=await readFile(new URL('../scripts/update-community-characters.mjs',import.meta.url),'utf8');
 const patched=patchCommunityDiscoverySource(source);
 assert.match(patched,/const releasePath=releaseEvidenceCurrent&&catalogBacked;/);
 assert.doesNotMatch(patched,/const releasePath=releaseEvidence\?releaseEvidenceCurrent:catalogBacked;/);
 assert.match(patched,/candidateMonth>='2026-10'&&eligible&&imageVerified&&releasePath&&consecutive>=REQUIRED_CONSECUTIVE/);
 assert.match(patched,/gradeTopics<MAX_GRADE_TOPICS_PER_MONTH/);
});
