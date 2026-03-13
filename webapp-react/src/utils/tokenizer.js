/**
 * Simple string tokenizer.
 *
 * Converted from the jQuery plugin: Tokenizer/jQuery.Tokenizer
 * Copyright (c) 2007-2008 Ariel Flesler - aflesler(at)gmail(dot)com
 * Dual licensed under MIT and GPL.
 *
 * @projectDescription JS Class to generate tokens from strings.
 * http://flesler.blogspot.com/2008/03/string-tokenizer-for-javascript.html
 */
export class Tokenizer {
  constructor(tokenizers, doBuild) {
    this.tokenizers = tokenizers && tokenizers.splice ? tokenizers : [tokenizers];
    if (doBuild) this.doBuild = doBuild;
  }

  parse(src) {
    this.src = src;
    this.ended = false;
    this.tokens = [];
    do this.next(); while (!this.ended);
    return this.tokens;
  }

  build(src, real) {
    if (src) {
      this.tokens.push(!this.doBuild ? src : this.doBuild(src, real, this.tkn));
    }
  }

  next() {
    this.findMin();
    const plain = this.src.slice(0, this.min);
    this.build(plain, false);

    this.src = this.src.slice(this.min).replace(this.tkn, (all) => {
      this.build(all, true);
      return '';
    });

    if (!this.src) this.ended = true;
  }

  findMin() {
    let i = 0;
    let tkn;
    let idx;
    this.min = -1;
    this.tkn = '';

    while ((tkn = this.tokenizers[i++]) !== undefined) {
      idx = this.src[tkn.test ? 'search' : 'indexOf'](tkn);
      if (idx !== -1 && (this.min === -1 || idx < this.min)) {
        this.tkn = tkn;
        this.min = idx;
      }
    }
    if (this.min === -1) this.min = this.src.length;
  }
}
