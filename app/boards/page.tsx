import './boards.css';
import Community from '../community';

// Keep the public board surface lightweight: Japanese/English only; media caps live in shared rules and APIs.
export default function Boards(){return <Community boardPage />;}
