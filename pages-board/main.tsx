import React from 'react';
import {createRoot} from 'react-dom/client';
import Community from '../app/community';
import CommentDraftSuccessGuard from '../app/comment-draft-success-guard';
import SectionBoundary from '../app/section-boundary';
import '../app/globals.css';
import '../app/community.css';
import '../app/boards/boards.css';

createRoot(document.getElementById('board-root')!).render(
  <SectionBoundary name="掲示板"><CommentDraftSuccessGuard /><Community boardPage /></SectionBoundary>
);
