/**
 * TopBar – the application header bar.
 *
 * Contains the search input, language switch button, clear button,
 * and settings gear icon.
 */
import TopBar from '@/components/TopBar/TopBar';
import { useSearchHandlers } from '@/hooks/useSearchHandlers';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store';

export default function TopBarWrapper() {
  const handlers = useSearchHandlers();
  const isDefinitionOnly = useSelector((s: RootState) => s.search.definition.isDefinitionOnly);
  const hideTopBar = isDefinitionOnly;  

  return (
    <>
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
    </>
  );
}
