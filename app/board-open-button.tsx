'use client';
export default function BoardOpenButton({className,children}:{className?:string;children:React.ReactNode}){
 return <button type="button" className={className} onClick={()=>{window.location.assign('/boards');}}>{children}</button>;
}
