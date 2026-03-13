/* Lightbox helper code for showing scanned dictionary pages */
import PhotoSwipeLightbox from '../../../lib/photoswipe/photoswipe-lightbox.esm.min.js';
import PhotoSwipe from '../../../lib/photoswipe/photoswipe.esm.min.js';

export class ScannedDictionaryViewer {
  constructor() {
    this.lightbox = null;
  }

  viewScan(path, pageInfo) {
    const data = [];

    for (let i = pageInfo.min_page; i <= pageInfo.max_page; i++) {
      data.push({
        src: path + i + '.png',
        width: pageInfo.width,
        height: pageInfo.height,
      });
    }

    this.lightbox = new PhotoSwipeLightbox({
      pswpModule: PhotoSwipe,
      dataSource: data,
      loop: false
    });
    this.lightbox.init();
    this.lightbox.loadAndOpen(pageInfo.term_page - pageInfo.min_page);
  }
}
