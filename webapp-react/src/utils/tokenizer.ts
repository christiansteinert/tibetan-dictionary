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

type Tokenizer_Type = string | RegExp;
type DoBuildCallback = (src: string, real: boolean, tkn?: Tokenizer_Type) => string | void;

export class Tokenizer {
  tokenizers: Tokenizer_Type[];
  doBuild?: DoBuildCallback;
  src: string = '';
  ended: boolean = false;
  tokens: string[] = [];
  min: number = -1;
  tkn: Tokenizer_Type = '';

  constructor(tokenizers: Tokenizer_Type[], doBuild?: DoBuildCallback) {
    this.tokenizers = tokenizers;
    if (doBuild) this.doBuild = doBuild;
  }

  parse(src: string): string[] {
    this.src = src;
    this.ended = false;
    this.tokens = [];
    do this.next(); while (!this.ended);
    return this.tokens;
  }

  build(src: string, real: boolean): void {
    if (src) {
      this.tokens.push(!this.doBuild ? src : (this.doBuild(src, real, this.tkn) as string) || src);
    }
  }

  next(): void {
    this.findMin();
    const plain = this.src.slice(0, this.min);
    this.build(plain, false);

    this.src = this.src.slice(this.min).replace(this.tkn, (all: string) => {
      this.build(all, true);
      return '';
    });

    if (!this.src) this.ended = true;
  }

  findMin(): void {
    let i = 0;
    let tkn: Tokenizer_Type;
    let idx: number;
    this.min = -1;
    this.tkn = '';

    while ((tkn = this.tokenizers[i++]) !== undefined) {
      idx = typeof tkn === 'string' 
        ? this.src.indexOf(tkn)
        : this.src.search(tkn);
      if (idx !== -1 && (this.min === -1 || idx < this.min)) {
        this.tkn = tkn;
        this.min = idx;
      }
    }
    if (this.min === -1) this.min = this.src.length;
  }
}
