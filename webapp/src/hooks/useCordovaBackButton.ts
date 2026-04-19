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

  // Keep refs to the current location and navigator so the event handler
  // can remain stable (and avoid re-registering) even when React rerenders.
  const locationRef = useRef(location);
  const navigateRef = useRef(navigate);
  locationRef.current = location;
  navigateRef.current = navigate;

  useEffect(() => {
    if (!(window as any).cordova) return;

    const onBackButton = (event: any) => {
      const now = Date.now();

      // If we are not on the home route, navigate back within the app.
      if (location.pathname !== '/') {
        event.preventDefault?.();
        event.stopPropagation?.();
        navigate(-1);
        return;
      }

      // If we are on home, only exit the app if back is pressed twice quickly.
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
    return () => document.removeEventListener('backbutton', onBackButton, false);
  }, []);
}
