/**
 * ScannedPageViewer – wrapper around PhotoSwipe for scanned dictionary pages.
 *
 * This is an imperative helper (not a rendered component) because
 * PhotoSwipe manages its own DOM. Call viewScan() to open the lightbox.
 */
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import PhotoSwipe from 'photoswipe';
import 'photoswipe/style.css';

export interface PageInfo {
  min_page: number;
  max_page: number;
  term_page: number;
  width: number;
  height: number;
}

let lightbox: PhotoSwipeLightbox | null = null;

/**
 * Open the scanned-page lightbox for a dictionary.
 *
 * @param dictId   – dictionary identifier (folder name under data/scan/)
 * @param termId   – unused but kept for API compat
 * @param pageInfo – page range and dimensions
 */
export function viewScan(dictId: string, termId: string, pageInfo: PageInfo): void {
  const path = `backend/data/scan/${dictId}/`;
  const slides = [];

  for (let i = pageInfo.min_page; i <= pageInfo.max_page; i++) {
    slides.push({
      src: path + i + '.png',
      width: pageInfo.width,
      height: pageInfo.height,
    });
  }

  // Destroy previous instance
  if (lightbox) {
    try { lightbox.destroy(); } catch { /* ignore */ }
  }

  lightbox = new PhotoSwipeLightbox({
    pswpModule: PhotoSwipe,
    dataSource: slides,
    loop: false,
  });
  lightbox.init();
  lightbox.loadAndOpen(pageInfo.term_page - pageInfo.min_page);
}
