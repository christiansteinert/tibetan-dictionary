/* Lightbox helper code for showing scanned dictionary pages */
import PhotoSwipeLightbox from '../../../lib/photoswipe/photoswipe-lightbox.esm.min.js';
import PhotoSwipe from '../../../lib/photoswipe/photoswipe.esm.min.js';

window.openLightbox = function(path, pageInfo) {
  var data = [];
  
  for(var i=pageInfo.min_page; i<=pageInfo.max_page; i++) {
    data.push({ 
      src: path+i+'.png',
      width: pageInfo.width,
      height: pageInfo.height,
    });
  };

  const lightbox = new PhotoSwipeLightbox({
    pswpModule: PhotoSwipe,
    dataSource: data,
    loop: false
  });
  lightbox.init();
  lightbox.loadAndOpen(pageInfo.term_page - pageInfo.min_page);
}
