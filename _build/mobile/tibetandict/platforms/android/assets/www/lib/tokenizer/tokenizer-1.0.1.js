/**
 * Tokenizer/jQuery.Tokenizer
 * Copyright (c) 2007-2008 Ariel Flesler - aflesler(at)gmail(dot)com | http://flesler.blogspot.com
 * Dual licensed under MIT and GPL.
 * Date: 2/29/2008
 *
 * @projectDescription JS Class to generate tokens from strings.
 * http://flesler.blogspot.com/2008/03/string-tokenizer-for-javascript.html
 *
 * @author Ariel Flesler
 * @version 1.0.1
 */
;(function(){
	
	var Tokenizer = function( tokenizers, doBuild ){
		if( !(this instanceof Tokenizer ) )
			return new Tokenizer( tokenizers, onEnd, onFound );
			
		this.tokenizers = tokenizers.splice ? tokenizers : [tokenizers];
		if( doBuild )
			this.doBuild = doBuild;
	};
	
	Tokenizer.prototype = {
		parse:function( src ){
			this.src = src;
			this.ended = false;
			this.tokens = [ ];
			do this.next(); while( !this.ended );
			return this.tokens;
		},
		build:function( src, real ){
			if( src )
				this.tokens.push(
					!this.doBuild ? src :
					this.doBuild(src,real,this.tkn)
				);	
		},
		next:function(){
			var self = this,
				plain;
				
			self.findMin();
			plain = self.src.slice(0, self.min);
			
			self.build( plain, false );
				
			self.src = self.src.slice(self.min).replace(self.tkn,function( all ){
				self.build(all, true);
				return '';
			});
			
			if( !self.src )
				self.ended = true;
		},
		findMin:function(){
			var self = this, i=0, tkn, idx;
			self.min = -1;
			self.tkn = '';
			
			while(( tkn = self.tokenizers[i++]) !== undefined ){
				idx = self.src[tkn.test?'search':'indexOf'](tkn);
				if( idx != -1 && (self.min == -1 || idx < self.min )){
					self.tkn = tkn;
					self.min = idx;
				}
			}
			if( self.min == -1 )
				self.min = self.src.length;
		}
	};
	
	if( window.jQuery ){
		jQuery.tokenizer = Tokenizer;//export as jquery plugin
		Tokenizer.fn = Tokenizer.prototype;
	}else
		window.Tokenizer = Tokenizer;//export as standalone class
	
})();