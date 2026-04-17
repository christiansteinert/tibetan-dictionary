/**
 * App – root component.
 *
 * Applies global CSS classes based on settings (dark theme, unicode mode)
 * and renders the TopBar + routed content.
 */
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from './store/store';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/common/ErrorBoundary';
import TopBar from '@/components/TopBar/TopBar';
import { useSearchHandlers } from '@/hooks/useSearchHandlers';
import { useLocation } from 'react-router-dom';
import '@/styles/shared.module.css';
import { useCordovaBackButton } from './hooks/useCordovaBackButton';

export default function App() {
  useCordovaBackButton();
  const { layout, unicode } = useSelector((s: RootState) => s.settings);
  const inputLang = useSelector((s: RootState) => s.search.input.inputLang);
  const sidebarVisible = useSelector((s: RootState) => s.search.resultList.sidebarVisible);
  const isDefinitionOnly = useSelector((s: RootState) => s.search.definition.isDefinitionOnly);
  const location = useLocation();
  const handlers = useSearchHandlers();

  const hideTopBar = isDefinitionOnly || location.pathname === '/settings';
  
  // Apply global CSS classes to <body> based on settings
  useEffect(() => {
    const body = document.body;

    // Theme
    body.classList.toggle('dark', layout === 'layout_black');

    // Unicode classes
    const isUnicode = unicode === true || unicode === 'output';
    body.classList.toggle('unicodeTib', isUnicode);
    body.classList.toggle('sidebarTib', isUnicode && inputLang === 'tib');
    body.classList.toggle('unicodeTibInput', unicode === true && inputLang === 'tib');
    body.classList.toggle('enInput', inputLang === 'en' || inputLang === 'skt' );

    // Screen resolution class
    body.classList.toggle('mobile', !!(window as any).cordova);
    body.classList.toggle('desktop', !(window as any).cordova);

    // sidebar state class
    body.classList.toggle('forceLeftSideVisible', sidebarVisible);

  }, [layout, unicode, inputLang, sidebarVisible]);

  return (
    <ErrorBoundary>
      <div id="mainScreen">
        {!hideTopBar && (
          <TopBar
            onInputChange={handlers.handleInputChange}
            onOpenExtendedSearch={handlers.handleOpenExtendedSearch}
            onCloseExtendedSearch={handlers.handleCloseExtendedSearch}
            onModeChange={handlers.handleModeChange}
            onLangChange={handlers.handleLangChange}
            onEnter={handlers.handleEnter}
            onArrowUp={handlers.handleSelectPrevTerm}
            onArrowDown={handlers.handleSelectNextTerm}
            onPageUp={handlers.handleSelectPrevPage}
            onPageDown={handlers.handleSelectNextPage}
          />
        )}
        <AppRoutes />
      </div>
    </ErrorBoundary>
  );
}
