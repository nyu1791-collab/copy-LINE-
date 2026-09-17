export function mediaRange(value:string|null,size:number){
 if(!value)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(value);
 if(!match||(!match[1]&&!match[2]))throw new Error('range');
 let start:number,end:number;
 if(!match[1]){
  const suffix=Number(match[2]);
  if(!Number.isSafeInteger(suffix)||suffix<=0)throw new Error('range');
  start=Math.max(0,size-suffix);end=size-1;
 }else{
  start=Number(match[1]);const requested=match[2]?Number(match[2]):size-1;
  if(!Number.isSafeInteger(requested))throw new Error('range');
  end=Math.min(requested,size-1);
 }
 if(!Number.isSafeInteger(start)||start<0||end<start||start>=size)throw new Error('range');
 return {start,end};
}

// Keep a no-Range video response deliberately small, but do not force every
// explicit browser Range request into that same tiny window. Native players
// commonly ask for larger sequential ranges; allowing a bounded larger window
// cuts Worker/D1/R2 round trips while still preventing a single request from
// streaming an entire large video.
export function boundedMediaRange(value:string|null,size:number,initialBytes:number,maxRequestedBytes:number){
 if(!Number.isSafeInteger(size)||size<=0||!Number.isSafeInteger(initialBytes)||initialBytes<=0||!Number.isSafeInteger(maxRequestedBytes)||maxRequestedBytes<initialBytes)throw new Error('range');
 const parsed=mediaRange(value,size);
 const start=parsed?.start??0;
 const requestedEnd=parsed?.end??size-1;
 const limit=parsed?maxRequestedBytes:initialBytes;
 return {start,end:Math.min(requestedEnd,size-1,start+limit-1)};
}
