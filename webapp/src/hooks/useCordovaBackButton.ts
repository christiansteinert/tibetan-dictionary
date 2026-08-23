/**
 * React hook to tweak the behavior of the back-button in Cordova/Android environments.
 *
 * On Android/Cordova, the hardware back button should:
 *   1) Navigate within the app when not on the home route.
 *   2) When on the home route, require two back presses within a short window
 *      (1500ms) to exit the app.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useCordovaBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastBackPress = useRef(0);

  // Keep refs synchronized with the latest router state on every render
  const locationRef = useRef(location);
  const navigateRef = useRef(navigate);
  
  useEffect(() => {
    locationRef.current = location;
    navigateRef.current = navigate;
  });

  useEffect(() => {
    if (!(window as any).cordova) return;

    const onBackButton = (event: any) => {
      const now = Date.now();
      const currentPath = locationRef.current.pathname;

      // 1) Navigate back within the app if not on home
      if (currentPath !== '/') {
        event.preventDefault?.();
        event.stopPropagation?.();
        navigateRef.current(-1);
        return;
      }

      // 2) Require two presses within 1500ms to exit when on home
      if (now - lastBackPress.current < 1500) {
        const navAny = navigator as any;
        if (navAny.app?.exitApp) {
          navAny.app.exitApp();
        }
        return;
      }

      lastBackPress.current = now;
      event.preventDefault?.();
      event.stopPropagation?.();
    };

    document.addEventListener('backbutton', onBackButton, false);

    return () => {
      document.removeEventListener('backbutton', onBackButton, false);
    };
  }, []);
}