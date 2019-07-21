package Lingua::BO::Wylie;

use 5.008;
use strict;
use utf8;
use Carp qw/croak/;

=head1 NAME

Lingua::BO::Wylie - Perl extension for to convert Tibetan text between Wylie to perl
Unicode strings.

=head1 SYNOPSIS

  use Lingua::BO::Wylie;
  binmode(STDOUT, ":utf8");

  my $wl = new Lingua::BO::Wylie();
  print $wl->from_wylie("sems can thams cad");

=head1 DESCRIPTION

This module converts chunks of Tibetan text from Wylie transliteration to Unicode,
and back.

Wylie transliteration is understood according to the "Extended Wylie
Transliteration System" defined by THL; see 
L<http://www.thlib.org/reference/transliteration/#essay=/thl/ewts/>
for more details.

=cut

our @ISA = ();
our $VERSION = '0.0020090210';
our @EXPORT_OK = ();
our @EXPORT = ();

use fields qw(check check_strict print_warnings fix_spacing _warns);

# Various classes of Tibetan symbols in Wylie and Unicode.
our %consonant = (
  k	=> "\x{0f40}",
  kh	=> "\x{0f41}",
  g	=> "\x{0f42}",
  gh	=> "\x{0f42}\x{0fb7}",
 "g+h"	=> "\x{0f42}\x{0fb7}",
  ng	=> "\x{0f44}",
  c	=> "\x{0f45}",
  ch	=> "\x{0f46}",
  j	=> "\x{0f47}",
  ny	=> "\x{0f49}",
  T	=> "\x{0f4a}",
 "-t"	=> "\x{0f4a}",
  Th	=> "\x{0f4b}",
 "-th"	=> "\x{0f4b}",
  D	=> "\x{0f4c}",
 "-d"	=> "\x{0f4c}",
  Dh	=> "\x{0f4c}\x{0fb7}",
 "D+h"	=> "\x{0f4c}\x{0fb7}",
 "-dh"	=> "\x{0f4c}\x{0fb7}",
 "-d+h"	=> "\x{0f4c}\x{0fb7}",
  N	=> "\x{0f4e}",
 "-n"	=> "\x{0f4e}",
  t	=> "\x{0f4f}",
  th	=> "\x{0f50}",
  d	=> "\x{0f51}",
  dh	=> "\x{0f51}\x{0fb7}",
 "d+h"	=> "\x{0f51}\x{0fb7}",
  n	=> "\x{0f53}",
  p	=> "\x{0f54}",
  ph	=> "\x{0f55}",
  b	=> "\x{0f56}",
  bh	=> "\x{0f56}\x{0fb7}",
 "b+h"	=> "\x{0f56}\x{0fb7}",
  m	=> "\x{0f58}",
  ts	=> "\x{0f59}",
  tsh	=> "\x{0f5a}",
  dz	=> "\x{0f5b}",
  dzh	=> "\x{0f5b}\x{0fb7}",
 "dz+h"	=> "\x{0f5b}\x{0fb7}",
  w	=> "\x{0f5d}",
  zh	=> "\x{0f5e}",
  z	=> "\x{0f5f}",
 "'"	=> "\x{0f60}",
 "\x{2018}"	=> "\x{0f60}",	# typographic quotes
 "\x{2019}"	=> "\x{0f60}",
  y	=> "\x{0f61}",
  r	=> "\x{0f62}",
  l	=> "\x{0f63}",
  sh	=> "\x{0f64}",
  Sh	=> "\x{0f65}",
 "-sh"	=> "\x{0f65}",
  s	=> "\x{0f66}",
  h	=> "\x{0f67}",
  W	=> "\x{0f5d}",
  Y	=> "\x{0f61}",
  R	=> "\x{0f6a}",
  f	=> "\x{0f55}\x{0f39}",
  v	=> "\x{0f56}\x{0f39}",
);

our %subjoined = (
  k	=> "\x{0f90}",
  kh	=> "\x{0f91}",
  g	=> "\x{0f92}",
  gh	=> "\x{0f92}\x{0fb7}",
 "g+h"	=> "\x{0f92}\x{0fb7}",
  ng	=> "\x{0f94}",
  c	=> "\x{0f95}",
  ch	=> "\x{0f96}",
  j	=> "\x{0f97}",
  ny	=> "\x{0f99}",
  T	=> "\x{0f9a}",
 "-t"	=> "\x{0f9a}",
  Th	=> "\x{0f9b}",
 "-th"	=> "\x{0f9b}",
  D	=> "\x{0f9c}",
 "-d"	=> "\x{0f9c}",
  Dh	=> "\x{0f9c}\x{0fb7}",
 "D+h"	=> "\x{0f9c}\x{0fb7}",
 "-dh"	=> "\x{0f9c}\x{0fb7}",
 "-d+h"	=> "\x{0f9c}\x{0fb7}",
  N	=> "\x{0f9e}",
 "-n"	=> "\x{0f9e}",
  t	=> "\x{0f9f}",
  th	=> "\x{0fa0}",
  d	=> "\x{0fa1}",
  dh	=> "\x{0fa1}\x{0fb7}",
 "d+h"	=> "\x{0fa1}\x{0fb7}",
  n	=> "\x{0fa3}",
  p	=> "\x{0fa4}",
  ph	=> "\x{0fa5}",
  b	=> "\x{0fa6}",
  bh	=> "\x{0fa6}\x{0fb7}",
 "b+h"	=> "\x{0fa6}\x{0fb7}",
  m	=> "\x{0fa8}",
  ts	=> "\x{0fa9}",
  tsh	=> "\x{0faa}",
  dz	=> "\x{0fab}",
  dzh	=> "\x{0fab}\x{0fb7}",
 "dz+h"	=> "\x{0fab}\x{0fb7}",
  w	=> "\x{0fad}",
  zh	=> "\x{0fae}",
  z	=> "\x{0faf}",
 "'"	=> "\x{0fb0}",
 "\x{2018}"	=> "\x{0fb0}",	# typographic quotes
 "\x{2019}"	=> "\x{0fb0}",
  y	=> "\x{0fb1}",
  r	=> "\x{0fb2}",
  l	=> "\x{0fb3}",
  sh	=> "\x{0fb4}",
  Sh	=> "\x{0fb5}",
 "-sh"	=> "\x{0fb5}",
  s	=> "\x{0fb6}",
  h	=> "\x{0fb7}",
  a	=> "\x{0fb8}",
  W	=> "\x{0fba}",
  Y	=> "\x{0fbb}",
  R	=> "\x{0fbc}",
);

our %vowel = (
  a	=> "\x{0f68}",	# a-chen
  A	=> "\x{0f71}",
  i	=> "\x{0f72}",
  I	=> "\x{0f71}\x{0f72}",
  u	=> "\x{0f74}",
  U	=> "\x{0f71}\x{0f74}",
  e	=> "\x{0f7a}",
  ai	=> "\x{0f7b}",
  o	=> "\x{0f7c}",
  au	=> "\x{0f7d}",
 "-i"	=> "\x{0f80}",
 "-I"	=> "\x{0f71}\x{0f80}",

# these are handled as "lata" or "rata" plus inverted vowel sign
# "r-i"	=> "\x{0fb2}\x{0f80}",
# "r-I"	=> "\x{0fb2}\x{0f71}\x{0f80}",
# "l-i"	=> "\x{0fb3}\x{0f80}",
# "l-I"	=> "\x{0fb3}\x{0f71}\x{0f80}",
);

# stuff that can come after the vowel
# symbol => [ unicode, class ]  (cannot have more than 1 of the same class in the same stack)
our %final = (
  M	=> [ "\x{0f7e}", "M" ],	# anusvara / bindu / circle above / nga ro
  H	=> [ "\x{0f7f}", "H" ],	# visarga / rnam bcad
 "~M`"	=> [ "\x{0f82}", "M" ],	# crescent, bindu & nada
 "~M"	=> [ "\x{0f83}", "M" ],	# crescent & bindu
 "?"	=> [ "\x{0f84}", "?" ],	# halanta / srog med
 "X"	=> [ "\x{0f37}", "X" ],	# small circle under
 "~X"	=> [ "\x{0f35}", "X" ],	# small circle w/ crescent under
 "^"	=> [ "\x{0f39}", "^" ],	# tsa-phru
);

our %other = (
  0	=> "\x{0f20}",
  1	=> "\x{0f21}",
  2	=> "\x{0f22}",
  3	=> "\x{0f23}",
  4	=> "\x{0f24}",
  5	=> "\x{0f25}",
  6	=> "\x{0f26}",
  7	=> "\x{0f27}",
  8	=> "\x{0f28}",
  9	=> "\x{0f29}",
# "-"	=> "\x{0f0b}",
 " "	=> "\x{0f0b}",
 "*"	=> "\x{0f0c}",
 "/"	=> "\x{0f0d}",
 "//"	=> "\x{0f0e}",
 ";"	=> "\x{0f0f}",
 "|"	=> "\x{0f11}",
 "!"	=> "\x{0f08}",
 ":"	=> "\x{0f14}",
 "_"	=> "\x{a0}",
 "="	=> "\x{0f34}",
 "<"	=> "\x{0f3a}",
 ">"	=> "\x{0f3b}",
 "("	=> "\x{0f3c}",
 ")"	=> "\x{0f3d}",
 "@"	=> "\x{0f04}",
 "#"	=> "\x{0f05}",
 '$'	=> "\x{0f06}",
 "%"	=> "\x{0f07}",
);

# special characters: flag those if they occur out of context
our %special = map { $_ => 1 } qw/. + - ~ ^ ? ` ]/;

# superscript => { letter or stack below => 1 }
our %superscripts = (
  r	=> { map { $_ => 1 } qw/k g ng j ny t d n b m ts dz k+y g+y m+y b+w ts+w g+w/ },
  l	=> { map { $_ => 1 } qw/k g ng c j t d p b h/ },
  s	=> { map { $_ => 1 } qw/k g ng ny t d n p b m ts k+y g+y p+y b+y m+y k+r g+r p+r b+r m+r n+r/ },
);

# subscript => { letter above => 1 }
our %subscripts = (
  y	=> { map { $_ => 1 } qw/k kh g p ph b m r+k r+g r+m s+k s+g s+p s+b s+m/ },
  r	=> { map { $_ => 1 } qw/k kh g t th d n p ph b m sh s h dz s+k s+g s+p s+b s+m s+n/ },
  l	=> { map { $_ => 1 } qw/k g b r s z/ },
  w	=> { map { $_ => 1 } qw/k kh g c ny t d ts tsh zh z r l sh s h g+r d+r ph+y r+g r+ts/ },
);

# prefix => { consonant or stack after => 1 }
our %prefixes = (
  g	=> { map { $_ => 1 } qw/c ny t d n ts zh z y sh s/ },
  d	=> { map { $_ => 1 } qw/k g ng p b m k+y g+y p+y b+y m+y k+r g+r p+r b+r/ },
  b	=> { map { $_ => 1 } qw/k g c t d ts zh z sh s r l k+y g+y k+r g+r r+l s+l r+k r+g r+ng r+j r+ny r+t r+d r+n r+ts r+dz s+k s+g s+ng s+ny s+t s+d s+n s+ts r+k+y r+g+y s+k+y s+g+y s+k+r s+g+r l+d l+t k+l s+r z+l s+w/ },
  m	=> { map { $_ => 1 } qw/kh g ng ch j ny th d n tsh dz kh+y g+y kh+r g+r/ },
 "'"	=> { map { $_ => 1 } qw/kh g ch j th d ph b tsh dz kh+y g+y ph+y b+y kh+r g+r d+r ph+r b+r/ },

 # typographic quotes
 "\x{2018}"	=> { map { $_ => 1 } qw/kh g ch j th d ph b tsh dz kh+y g+y ph+y b+y kh+r g+r d+r ph+r b+r/ },
 "\x{2019}"	=> { map { $_ => 1 } qw/kh g ch j th d ph b tsh dz kh+y g+y ph+y b+y kh+r g+r d+r ph+r b+r/ },
);

# suffix => 1
# also included are some Skt letters b/c they occur often in suffix position in Skt words
our %suffixes = map { $_ => 1 } ("'", "\x{2018}", "\x{2019}", qw/g ng d n b m r l s N T -n -t/);

# 2nd suffix => letter before
our %suff2 = (
  s	=> { map { $_ => 1 } qw/g ng b m/ },
  d	=> { map { $_ => 1 } qw/n r l/ },
);

# root letter index for very ambiguous 3 letter syllables
our %ambiguous = (
  dgs	=> [ 1, "dgas" ],
 "'gs"	=> [ 1, "'gas" ],
  dbs	=> [ 1, "dbas" ],
  dms	=> [ 1, "dmas" ],
  bgs	=> [ 0, "bags" ],
  mngs	=> [ 0, "mangs" ],
);

### reverse mappings (Unicode to Wylie)

our %tib_top = (
  "\x{0f40}"		=> "k",
  "\x{0f41}"		=> "kh",
  "\x{0f42}"		=> "g",
  "\x{0f43}"		=> "g+h",
  "\x{0f44}"		=> "ng",
  "\x{0f45}"		=> "c",
  "\x{0f46}"		=> "ch",
  "\x{0f47}"		=> "j",
  "\x{0f49}"		=> "ny",
  "\x{0f4a}"		=> "T",
  "\x{0f4b}"		=> "Th",
  "\x{0f4c}"		=> "D",
  "\x{0f4d}"		=> "D+h",
  "\x{0f4e}"		=> "N",
  "\x{0f4f}"		=> "t",
  "\x{0f50}"		=> "th",
  "\x{0f51}"		=> "d",
  "\x{0f52}"		=> "d+h",
  "\x{0f53}"		=> "n",
  "\x{0f54}"		=> "p",
  "\x{0f55}"		=> "ph",
  "\x{0f56}"		=> "b",
  "\x{0f57}"		=> "b+h",
  "\x{0f58}"		=> "m",
  "\x{0f59}"		=> "ts",
  "\x{0f5a}"		=> "tsh",
  "\x{0f5b}"		=> "dz",
  "\x{0f5c}"		=> "dz+h",
  "\x{0f5d}"		=> "w",
  "\x{0f5e}"		=> "zh",
  "\x{0f5f}"		=> "z",
  "\x{0f60}"		=> "'",
  "\x{0f61}"		=> "y",
  "\x{0f62}"		=> "r",
  "\x{0f63}"		=> "l",
  "\x{0f64}"		=> "sh",
  "\x{0f65}"		=> "Sh",
  "\x{0f66}"		=> "s",
  "\x{0f67}"		=> "h",
  "\x{0f68}",		=> "a",
  "\x{0f69}",		=> "k+Sh",
  "\x{0f6a}"		=> "R",
);

our %tib_subjoined = (
  "\x{0f90}"		=> "k",
  "\x{0f91}"		=> "kh",
  "\x{0f92}"		=> "g",
  "\x{0f93}"		=> "g+h",
  "\x{0f94}"		=> "ng",
  "\x{0f95}"		=> "c",
  "\x{0f96}"		=> "ch",
  "\x{0f97}"		=> "j",
  "\x{0f99}"		=> "ny",
  "\x{0f9a}"		=> "T",
  "\x{0f9b}"		=> "Th",
  "\x{0f9c}"		=> "D",
  "\x{0f9d}"		=> "D+h",
  "\x{0f9e}"		=> "N",
  "\x{0f9f}"		=> "t",
  "\x{0fa0}"		=> "th",
  "\x{0fa1}"		=> "d",
  "\x{0fa2}"		=> "d+h",
  "\x{0fa3}"		=> "n",
  "\x{0fa4}"		=> "p",
  "\x{0fa5}"		=> "ph",
  "\x{0fa6}"		=> "b",
  "\x{0fa7}"		=> "b+h",
  "\x{0fa8}"		=> "m",
  "\x{0fa9}"		=> "ts",
  "\x{0faa}"		=> "tsh",
  "\x{0fab}"		=> "dz",
  "\x{0fac}"		=> "dz+h",
  "\x{0fad}"		=> "w",
  "\x{0fae}"		=> "zh",
  "\x{0faf}"		=> "z",
  "\x{0fb0}"		=> "'",
  "\x{0fb1}"		=> "y",
  "\x{0fb2}"		=> "r",
  "\x{0fb3}"		=> "l",
  "\x{0fb4}"		=> "sh",
  "\x{0fb5}"		=> "Sh",
  "\x{0fb6}"		=> "s",
  "\x{0fb7}"		=> "h",
  "\x{0fb8}"		=> "a",
  "\x{0fb9}"		=> "k+Sh",
  "\x{0fba}"		=> "W",
  "\x{0fbb}"		=> "Y",
  "\x{0fbc}"		=> "R",
);

our %tib_vowel = (
  # a-chen is not here because that's a top character, not a vowel sign.
  # pre-composed "I" and "U" are dealt here; other pre-composed Skt vowels are more
  # easily handled by a global replace in to_wylie(), b/c they turn into subjoined "r"/"l".
  "\x{0f71}"		=> "A",
  "\x{0f72}"		=> "i",
  "\x{0f73}"		=> "I",
  "\x{0f74}"		=> "u",
  "\x{0f75}"		=> "U",
  "\x{0f7a}"		=> "e",
  "\x{0f7b}"		=> "ai",
  "\x{0f7c}"		=> "o",
  "\x{0f7d}"		=> "au",
  "\x{0f80}"		=> "-i",
);

our %tib_vowel_long = (
  i	=> "I",
  u	=> "U",
 "-i"	=> "-I",
);

# unicode => [ wylie, class ] (cannot have more than 1 of the same class in the same stack)
our %tib_final = (
  "\x{0f35}"	=> [ "~X",  "X" ],
  "\x{0f37}"	=> [ "X",   "X" ],
  "\x{0f39}"	=> [ "^",   "^" ],
  "\x{0f7e}"	=> [ "M",   "M" ],
  "\x{0f7f}"	=> [ "H",   "H" ],
  "\x{0f82}"	=> [ "~M`", "M" ],
  "\x{0f83}"	=> [ "~M",  "M" ],
  "\x{0f84}"	=> [ "?",   "?" ],
);

our %tib_caret = (
  ph	=> "f",
  b	=> "v",
);

our %tib_other = (
  #" "		=> "_",
  "\x{a0}"	=> "_",
  "\x{0f04}"	=> "@",
  "\x{0f05}"	=> "#",
  "\x{0f06}"	=> '$',
  "\x{0f07}"	=> "%",
  "\x{0f08}"	=> "!",
  "\x{0f0b}"	=> " ",
  "\x{0f0c}"	=> "*",
  "\x{0f0d}"	=> "/",
  "\x{0f0e}"	=> "//",
  "\x{0f0f}"	=> ";",
  "\x{0f11}"	=> "|",
  "\x{0f14}"	=> ":",
  "\x{0f20}"	=> "0",
  "\x{0f21}"	=> "1",
  "\x{0f22}"	=> "2",
  "\x{0f23}"	=> "3",
  "\x{0f24}"	=> "4",
  "\x{0f25}"	=> "5",
  "\x{0f26}"	=> "6",
  "\x{0f27}"	=> "7",
  "\x{0f28}"	=> "8",
  "\x{0f29}"	=> "9",
  "\x{0f34}"	=> "=",
  "\x{0f3a}"	=> "<",
  "\x{0f3b}"	=> ">",
  "\x{0f3c}"	=> "(",
  "\x{0f3d}"	=> ")",
);

# all these stacked consonant combinations don't need "+"s in them
our %tib_stacks = map { $_ => 1 }
     qw/b+l b+r b+y c+w d+r d+r+w d+w dz+r g+l g+r g+r+w g+w g+y h+r h+w k+l 
	k+r k+w k+y kh+r kh+w kh+y l+b l+c l+d l+g l+h l+j l+k l+ng l+p l+t 
	l+w m+r m+y n+r ny+w p+r p+y ph+r ph+y ph+y+w r+b r+d r+dz r+g 
	r+g+w r+g+y r+j r+k r+k+y r+l r+m r+m+y r+n r+ng r+ny r+t r+ts r+ts+w 
	r+w s+b s+b+r s+b+y s+d s+g s+g+r s+g+y s+k s+k+r s+k+y s+l s+m s+m+r 
	s+m+y s+n s+n+r s+ng s+ny s+p s+p+r s+p+y s+r s+t s+ts s+w sh+r sh+w 
	t+r t+w th+r ts+w tsh+w z+l z+w zh+w/;

# INITIALIZATIONS

# precompute the regexp to split a string into Wylie tokens.  sort by decreasing size
# so that things like "sh" don't get split into ("s", "h").  the "." and the "/s" at the
# end ensure that any remaining characters are taken as a single-char token.
my @all_tokens = 
  sort { length($b) <=> length($a) or $a cmp $b } 
    grep { length($_) > 1 }
    keys %{ { %consonant, %subjoined, %vowel, %final, %other } };

my $tokens_regexp1 = join "|", map { "\Q$_\E" } @all_tokens;
my $tokens_regexp = qr/($tokens_regexp1|\\u....|\\U........|\\.|\r\n|.)/s;

# Defaults for conversion.
my %defaults = (
  check			=> 1,
  check_strict		=> 1,
  print_warnings	=> 1,
  fix_spacing		=> 1,
);

=head1 METHODS

=head2 CONSTRUCTOR: new (%args)

To create a new Lingua::BO::Wylie object, use the B<new> class method.  

Arguments include: 

=over 4

=item * check

(bool) generate warnings for illegal consonant sequences; default is true.

=item * check_strict

(bool) stricter checking, examine the whole stack; default is true.

=item * print_warnings

(bool) print generated warnings to STDOUT; default is true.

=item * fix_spacing

(bool) remove spaces after newlines, collapse multiple spaces (tseks) into one...

=back

=cut

sub new {
  my ($self, %opts) = @_;
  unless (ref $self) {
    $self = fields::new($self);
  }

  %$self = (%defaults, %opts);
  $self->{_warns} = [];

  # some options imply other options...
  if ($opts{check_strict}) {
    $self->{check} = 1;

  } elsif (exists $opts{check} and !$opts{check}) {
    $self->{check_strict} = undef;
    croak "Cannot have 'check_strict' without 'check'." 
      if $opts{check_strict};
  }

  return $self;
}

=head2 from_wylie ($str, %args)

Converts from Wylie transliteration to Unicode perl string.

Possible %args include:
  - keep	- a string of characters which should be preserved, unprocessed

Returns: a Unicode string

To get the warnings, call $wl->get_warnings() afterwards.

=cut

sub from_wylie {
  my ($self, $str, %args) = @_;
  my @out;
  my $line = 1;
  my $units = 0;
  $self->{_warns} = [];

  # characters to keep?
  my %keep;
  if (defined($args{keep})) {
    %keep = map { ($_ => 1) } split //, $args{keep};
  }

  # remove initial spaces
  $str =~ s/^\s+// if $self->{fix_spacing};

  # split into tokens
  my @tokens = ($str =~ /$tokens_regexp/go);
  my $i = 0;

  # iterate over them
ITER: 
  while (defined(my $t = $tokens[$i])) {
    my $o;

    # characters to keep untouched
    if ($keep{$t}) {
      push @out, $t;
      $i++;
      next ITER;
    }

    # [non-tibetan text] : pass through, nesting brackets
    if ($t eq "[") {
      my $nesting = 1;
      $i++;
      while (defined($t = $tokens[$i++])) {
        $nesting++ if $t eq "[";
        $nesting-- if $t eq "]";
	next ITER if $nesting == 0;

	# handle unicode escapes and \1-char escapes within [comments]...
	if ($t =~ /^(\\u)(....)$/ || $t =~ /^(\\U)(........)/) {
	  my ($esc, $hex) = ($1, $2);
	  unless ($hex =~ /^[0-9a-fA-F]+$/) {
	    $self->_warn(qq{line $line: "$esc$hex": invalid hexadecimal code.});
	  }
	  $t = chr hex $hex;

	} elsif ($t =~ /^\\(.)/) {
	  $t = $1;
	}

	push @out, $t;
      }

      $self->_warn("line $line: Unfinished [non-Wylie stuff].");
      last ITER;
    }

    # punctuation, numbers, etc
    if ($o = $other{$t}) {
      push @out, $o;
      $i++;
      $units++;

      # collapse multiple spaces
      if ($t eq " " && $self->{fix_spacing}) {
        $i++ while (($tokens[$i] || "") eq " ");
      }
      next ITER;
    }

    # vowels & consonants: process tibetan script up to a tsek, punctuation or line noise
    if ($vowel{$t} || $consonant{$t}) {
      my ($uni, $toks, $warns) = $self->_from_wylie_one_tsekbar(\@tokens, $i);
      my $word = join "", @tokens[$i .. $i + $toks - 1];
      push @out, $uni;
      $i += $toks;
      $units++;

      foreach my $w (@$warns) {
	$self->_warn(qq{line $line: "$word": $w});
      }

      next ITER;
    }

    ### misc unicode and line handling things:

    # ignore BOM
    if ($t eq "\x{feff}") {
      $i++;
      next ITER;
    }

    # \u, \U unicode characters
    if ($t =~ /^(\\u)(....)$/ || $t =~ /^(\\U)(........)/) {
      my ($esc, $hex) = ($1, $2);
      unless ($hex =~ /^[0-9a-fA-F]+$/) {
	$self->_warn(qq{line $line: "$esc$hex": invalid hexadecimal code.});
      }

      $i++;
      push @out, chr hex $hex;
      next ITER;
    }

    # backslashed characters
    if ($t =~ /^\\(.)/) {
      push @out, $1;
      $i++;
      next ITER;
    }

    # count lines
    if ($t eq "\r\n" || $t eq "\n" || $t eq "\r") {
      $line++;
      push @out, $t;
      $i++;

      # also eat spaces after newlines (optional)
      if ($self->{fix_spacing}) {
        while (defined($t = $tokens[$i]) && $t eq " ") {
	  $i++;
	}
      }

      next ITER;
    }

    # stuff that shouldn't occur out of context: special chars and remaining [a-zA-Z]
    if ($special{$t} || $t =~ /[a-zA-Z]/) {
      $self->_warn(qq{line $line: Unexpected character "$t".});
    }

    # anything else: pass through
    push @out, $t;
    $i++;
  }

  $self->_warn(qq{No Tibetan characters found!}) unless $units;

  return join "", @out;
}

=head2 get_warnings ()

Retrieve the list of warnings generated from the previous conversion.

Returns: an arrayref with one line per warning.

=cut

sub get_warnings {
  my ($self) = @_;
  return $self->{_warns} || [];
}

=head2 to_wylie ($str)

Converts from Unicode srings to Wylie (EWTS) transliteration.

Returns: the transliterated string.

To get the warnings, call $wl->get_warnings() afterwards.

=cut

sub to_wylie {
  my ($self, $str) = @_;
  my @out;
  my $line = 1;
  my $units = 0;
  $self->{_warns} = [];

  my ($toks, $out, $warns);

  # globally search and replace some deprecated pre-composed Sanskrit vowels
  $str =~ s/\x{f76}/\x{fb2}\x{f80}/g;
  $str =~ s/\x{f77}/\x{fb2}\x{f71}\x{f80}/g;
  $str =~ s/\x{f78}/\x{fb3}\x{f80}/g;
  $str =~ s/\x{f79}/\x{fb3}\x{f71}\x{f80}/g;
  $str =~ s/\x{f81}/\x{f71}\x{f80}/g;

  # split into codepoints (not full characters)
  my @tokens = split //, $str;
  my $i = 0;

  # loop over them 
ITER: 
  while (defined(my $t = $tokens[$i])) {

    # found tibetan script... handle one tsekbar
    if ($tib_top{$t}) {

      # (we don't need the 4th return value, the analyzed stacks)
      ($toks, $out, $warns) = $self->_to_wylie_one_tsekbar(\@tokens, $i);
      push @out, $out;
      $i += $toks;
      $units++;

      foreach my $w (@$warns) {
	$self->_warn(qq{line $line: $w});
      }

      next ITER;
    }

    # punctuation & special stuff...
    if (defined(my $o = $tib_other{$t})) {
      push @out, $o;
      $i++;
      $units++;
      next ITER;
    }

    # newlines, count lines.  "\r\n" together count as one newline.
    if ($t eq "\n" || $t eq "\r") {
      $line++;
      $i++;
      push @out, $t;

      if ($t eq "\r" && ($tokens[$i] || '') eq "\n") {
	$i++;
	push @out, "\n";
      }
      next ITER;
    }

    # ignore BOM
    if ($t eq "\x{feff}") {
      $i++;
      next ITER;
    }

    # other characters in the tibetan plane, escape with \u0fxx
    if (ord($t) >= 0xf00 && ord($t) <= 0xfff) {
      my $char = sprintf "\\u%.4x", ord($t);
      push @out, $char;
      $i++;

      # warn for tibetan codepoints that should appear only after a tib_top
      if ($tib_subjoined{$t} || $tib_vowel{$t} || $tib_final{$t}) {
	$self->_warn(qq{line $line: Tibetan sign $char needs a top symbol to attach to.});
      }

      next ITER;
    }

    # anything else... put it in [comments], escaping [] sequences and closing at
    # line ends

    # space before non-Tibetan stuff gets put in the [ brackets] instead of _[before].
    if (@out && $out[$#out] eq '_') {
      pop @out;
      push @out, '[ ';
    } else {
      push @out, '[';
    }

    # in [comments]...
    while (!$tib_top{$t} && (!$tib_other{$t} || $t eq " ") && $t ne "\r" && $t ne "\n") {

      # \escape [opening and closing] brackets
      if ($t eq '[' || $t eq ']') {
	push @out, "\\$t";

      # unicode-escape anything in the tibetan plane (i.e characters not handled by Wylie)
      } elsif (ord($t) >= 0xf00 && ord($t) <= 0xfff) {
        push @out, sprintf("\\u%.4x", ord($t));

      # and just pass through anything else!
      } else {
	push @out, $t;
      }

      $t = $tokens[++$i];
      last unless defined $t;
    }

    push @out, ']';
    next ITER;
  }

  return join "", @out;
}

# INTERNAL FUNCTIONS

# Convert Unicode to Wylie: one stack at a time.

sub _to_wylie_one_stack {
  my ($self, $tokens, $i) = @_;
  my $orig_i = $i;
  my @warns;
  my ($final, $vowel, $class);
  my $o;

  # split the stack into: 
  #   - top symbol
  #   - stacked signs (first is the top symbol again, then subscribed main characters...)
  #   - caret (did we find a stray tsa-phru or not?)
  #   - vowel signs (including small subscribed a-chung, "-i" Skt signs, etc)
  #   - final stuff (including anusvara, visarga, halanta...)
  #   - and some more variables to keep track of what has been found
  my $stack = {
    top 	=> undef,	# $
    stack	=> [],		# \@  (consonants and also a-chen)
    caret	=> undef,	# "^" or undef
    vowels	=> [],		# \@
    finals	=> [],		# \@

    finals_found => {},		# { class of final => 1 }
    visarga	=> undef,	# boolean
    cons_str	=> undef,	# all stack elements separated by "+"
    single_cons	=> undef,	# is this a single consonant with no vowel signs or finals?
    prefix	=> undef,	# boolean, later set to true if this is a prefix
    suffix	=> undef,	# boolean, later set to true if this is a suffix
    suff2	=> undef,	# boolean, later set to true if this is a 2nd suffix
    dot		=> undef,	# boolean, later set to true if we need a "." as in "g.yag"
  };

  # assume: tib_top{$t} exists
  my $t = $tokens->[$i++];
  $stack->{top} = $tib_top{$t};
  push @{ $stack->{stack} }, $tib_top{$t};

  # grab everything else below the top sign and classify in various categories
  while (defined($t = $tokens->[$i]) &&
	 ($tib_subjoined{$t} || $tib_vowel{$t} || $tib_final{$t}))
  {
    if ($o = $tib_subjoined{$t}) {
      push @{ $stack->{stack} }, $o;

      # check for bad ordering...
      if (@{ $stack->{finals} }) {
	push @warns, qq{Subjoined sign "$o" found after final sign "$final".}
      } elsif (@{ $stack->{vowels} }) {
	push @warns, qq{Subjoined sign "$o" found after vowel sign "$vowel".}
      }

    } elsif ($o = $tib_vowel{$t}) {
      push @{ $stack->{vowels} }, $o;
      $vowel ||= $o;

      # check for bad ordering...
      push @warns, qq{Vowel sign "$o" found after final sign "$final".}
	if @{ $stack->{finals} };

    } elsif ($o = $tib_final{$t}) {
      ($o, $class) = @$o;
      if ($o eq "^") {
	$stack->{caret} = "^";
      } else {
	push @{ $stack->{finals} }, $o;
	$final ||= $o;

	# check for invalid combinations...
	if ($stack->{finals_found}{$class}) {
	  push @warns, 
	    qq{Final sign "$o" should not combine with final sign "$stack->{finals_found}{$class}".}
	} else {
	  $stack->{finals_found}{$class} = $o;
	}
      }
      $stack->{visarga} = 1 if $o eq "H";
    }

    $i++;
  }

  # a-chen with vowel signs: remove the "a" and keep the vowel signs
  if ($stack->{top} eq "a" && scalar(@{ $stack->{stack} }) == 1 && @{ $stack->{vowels} }) {
    shift @{ $stack->{stack} };
  }

  # handle long vowels: A+i becomes I, etc.
  if (scalar(@{ $stack->{vowels} }) > 1 && 
      $stack->{vowels}[0] eq "A" &&
      $tib_vowel_long{ $stack->{vowels}[1] })
  {
    splice @{ $stack->{vowels} }, 0, 2, $tib_vowel_long{ $stack->{vowels}[1] };
  }

  # special cases: "ph^" becomes "f", "b^" becomes "v"
  if ($stack->{caret} && 
      scalar(@{ $stack->{stack} }) == 1 && 
      $tib_caret{ $stack->{top} })
  {
    $stack->{top} = $stack->{stack}[0] = $tib_caret{ $stack->{top} };
    $stack->{caret} = undef;
  }

  $stack->{cons_str} = join "+", @{ $stack->{stack} };

  # if this is a single consonant, keep track of it (useful for prefix/suffix analysis)
  if (scalar(@{ $stack->{stack} }) == 1 &&
      $stack->{stack}[0] ne "a" &&
      !$stack->{caret} && 
      !@{ $stack->{vowels} } &&
      !@{ $stack->{finals} })
  {
    $stack->{single_cons} = $stack->{cons_str};
  }

  # return the analyzed stack
  return (
    $i - $orig_i,
    $stack,
    \@warns,
  );
}

# Puts an analyzed stack together into Wylie output, adding an implicit "a" if needed.

sub _put_stack_together {
  my ($self, $stack) = @_;
  my @out;

  # put the main elements together... stacked with "+" unless it's a regular stack
  if ($tib_stacks{ $stack->{cons_str} }) {
    push @out, join "", @{ $stack->{stack} };
  } else {
    push @out, $stack->{cons_str};
  }

  # caret (tsa-phru) goes here as per some (halfway broken) Unicode specs...
  push @out, "^" if $stack->{caret};

  # vowels...
  if (@{ $stack->{vowels} }) {
    push @out, join "+", @{ $stack->{vowels} };

  } elsif ($stack->{cons_str} !~ /a$/ && 
	   !$stack->{prefix} && !$stack->{suffix} && !$stack->{suff2})
  {
    push @out, "a";
  }
  
  # final stuff...
  push @out, @{ $stack->{finals} };
  push @out, "." if $stack->{dot};

  return join "", @out;
}

# Convert Unicode to Wylie: one tsekbar

sub _to_wylie_one_tsekbar {
  my ($self, $tokens, $i) = @_;
  my $orig_i = $i;
  my ($toks, $stack, $warns);
  my @warns;
  my @stacks;
  my @out;

  # make a list of stacks, until we get to punctuation or to a visarga
  ITER: {
    ($toks, $stack, $warns) = $self->_to_wylie_one_stack($tokens, $i);
    push @stacks, $stack;
    push @warns, @$warns;
    $i += $toks;

    last if $stack->{visarga};
    my $t = $tokens->[$i];
    redo ITER if $t && $tib_top{$t};
  }

  # figure out if some of these stacks can be prefixes or suffixes (in which case
  # they don't need their "a" vowels)
  my $last = $#stacks;

  if (scalar(@stacks) > 1 && $stacks[0]{single_cons}) {
    # we don't count the wazur in the root stack, for prefix checking
    my $cs = $stacks[1]{cons_str};
    $cs =~ s/\+w//g;

    if ($prefixes{ $stacks[0]{single_cons} }{$cs}) {
      $stacks[0]{prefix} = 1;
    }
  }

  if (scalar(@stacks) > 1 &&
      $stacks[$last]{single_cons} &&
      $suffixes{ $stacks[$last]{single_cons} })
  {
    $stacks[$last]{suffix} = 1;
  }

  if (scalar(@stacks) > 2 &&
      $stacks[$last]{single_cons} &&
      $stacks[$last - 1]{single_cons} &&
      $suffixes{ $stacks[$last - 1]{single_cons} } &&
      $suff2{ $stacks[$last]{single_cons} }{ $stacks[$last - 1]{single_cons} })
  {
    $stacks[$last]{suff2} = 1;
    $stacks[$last - 1]{suffix} = 1;
  }

  # if there are two stacks and both can be prefix-suffix, then 1st is root
  if (scalar(@stacks) == 2 && $stacks[0]{prefix} && $stacks[1]{suffix}) {
    $stacks[0]{prefix} = undef;
  }

  # if there are three stacks and they can be prefix, suffix and suff2, then check w/ a table
  if (scalar(@stacks) == 3 && $stacks[0]{prefix} && $stacks[1]{suffix} && $stacks[2]{suff2}) {
    my $str = join "", map { $_->{single_cons} } @stacks;
    my $amb = $ambiguous{$str};
    my $root;

    if ($amb) {
      $root = $amb->[0];
    } else {
      push @warns, "Ambiguous syllable found: root consonant not known for \"$str\".";
      # make it up...  (ex. "mgas" for ma, ga, sa)
      $root = 1;
    }

    $stacks[$root]{prefix} = $stacks[$root]{suffix} = undef;
    $stacks[$root + 1]{suff2} = undef;
  }

  # if the prefix together with the main stack could be mistaken for a single stack, add a "."
  if ($stacks[0]{prefix} && $tib_stacks{ $stacks[0]{single_cons} . "+" . $stacks[1]{cons_str} }) {
    $stacks[0]{dot} = 1;
  }

  # put it all together...
  my $out = join "", map { $self->_put_stack_together($_) } @stacks;
  return (
    $i - $orig_i,
    $out,
    \@warns,
    \@stacks
  );
}

# Escape a string, with all non-ASCII unicode chars encoded as \x{...}.

sub _dump {
  my $str = shift;
  $str = shift if ref($str);
  my @out;
  foreach my $i (split //, $str) {
    if (ord($i) >= 32 && ord($i) <= 127) {
      push @out, $i;
    } else {
      push @out, '\\x{' . sprintf("%x", ord($i)) . '}';
    }
  }
  return join "", @out;
}

# Looking from $i onwards within @tokens, returns as many consonants as it finds,
# up to and not including the next vowel or punctuation.  Skips the caret "^".
# 
# Returns: a string of consonants joined by "+" signs.

sub _consonant_string {
  my ($self, $tokens, $i) = @_;
  my @out;
  my $t;

  while (defined($t = $tokens->[$i++])) {
    next if $t eq "+" || $t eq "^";
    last unless $consonant{$t};
    push @out, $t;
  }

  return join "+", @out;
}

# Looking from $i backwards within @tokens, at most up to $orig_i, returns as 
# many consonants as it finds, up to and not including the next vowel or
# punctuation.  Skips the caret "^".
# 
# Returns: a string of consonants (in forward order) joined by "+" signs.

sub _consonant_string_backwards {
  my ($self, $tokens, $i, $orig_i) = @_;
  my @out;
  my $t;

  while ($i >= $orig_i && defined($t = $tokens->[$i--])) {
    next if $t eq "+" || $t eq "^";
    last unless $consonant{$t};
    push @out, $t;
  }

  return join "+", reverse @out;
}

# $self->_from_wylie_onestack (\@tokens, $i)
# 
# Converts one stack's worth of Wylie into unicode, starting at the given index
# within the array of tokens.
# 
# Assumes that the first available token is valid, and is either a vowel or a consonant.
# 
# Returns a list of:
#  - unicode string
#  - number of tokens used
#  - the (Wylie) consonant if this stack was a single consonant w/o vowel, otherwise undef
#  - the (Wylie) consonant if this stack was a single consonant w/ "a", otherwise undef
#  - list of warning strings (arrayref)
#  - did we find a visarga?  (boolean)

sub _from_wylie_onestack {
  my ($self, $tokens, $i) = @_;
  my $orig_i = $i;
  my ($t, $t2, $o);
  my @out;
  my @warns;

  my $consonants = 0;	# how many consonants found
  my $vowel_found;	# any vowels?  (including a-chen)
  my $vowel_sign = 0;	# any vowel signs (that go under or over the main stack)
  my $single_consonant;	# did we find just a consonant?
  my $plus;		# any explicit subjoining via "+"?
  my $caret;		# find any "^"?
  my %final_found;	# keep track of finals (H, M, etc) to warn on repetition


  # do we have a superscript?
  $t = $tokens->[$i];
  $t2 = $tokens->[$i+1];
  if (defined($t2) && $superscripts{$t} && $superscripts{$t}{$t2}) {

    if ($self->{check_strict}) {
      my $next = $self->_consonant_string($tokens, $i+1);
      unless ($superscripts{$t}{$next}) {
        $next =~ tr/+//d;
	push @warns, "Superscript \"$t\" does not occur above combination \"$next\"."
      }
    }

    push @out, $consonant{$t};
    $consonants++;
    $i++;
    do { $caret++, $i++ } if (($tokens->[$i] || "") eq "^");
  }

  # main consonant + stuff underneath.  
  # this is a named loop b/c the "+" subjoining operator comes back here
  MAIN: {

    # main consonant (or "a" after a "+")
    $t = $tokens->[$i];
    if ($consonant{$t} || @out && $subjoined{$t}) {
      push @out, (@out ? $subjoined{$t} : $consonant{$t});
      $i++;

      if ($t eq "a") {
        $vowel_found = "a";
      } else {
	$consonants++;
	$single_consonant = $t;
      }
      do { $caret++, $i++ } if (($tokens->[$i] || "") eq "^");

      # subjoined: rata, yata, lata, wazur.  there can be up two subjoined letters in a stack.
      foreach my $z (0, 1) {
	$t2 = $tokens->[$i];

	if (defined($t2) && $subscripts{$t2}) {

	  # lata does not occur below multiple consonants (otherwise we mess up "brla" = "b.r+la")
	  last if $t2 eq "l" && $consonants > 1;

	  # full stack checking (disabled by "+")
	  if ($self->{check_strict} && !$plus) {
	    my $prev = $self->_consonant_string_backwards($tokens, $i-1, $orig_i);
	    unless ($subscripts{$t2}{$prev}) {
	      $prev =~ tr/+//d;
	      push @warns, "Subjoined \"$t2\" not expected after \"$prev\"." 
	    }

	  } elsif ($self->{check}) {
	    unless ($subscripts{$t2}{$t} || ($z == 1 && $t2 eq "w" && $t eq "y")) {
	      push @warns, "Subjoined \"$t2\" not expected after \"$t\"." 
	    }
	  }

	  push @out, $subjoined{$t2};
	  $i++;
	  $consonants++;
	  do { $caret++, $i++ } if (($tokens->[$i] || "") eq "^");
	  $t = $t2;

	} else {
	  last;
	}
      }
    }

    # caret (^) can come anywhere in Wylie but in Unicode we generate it at the end of 
    # the stack but before vowels if it came there (seems to be what OpenOffice expects),
    # or at the very end of the stack if that's how it was in the Wylie.
    if ($caret) {
      push @warns, "Cannot have more than one \"^\" applied to the same stack." if $caret > 1;
      $final_found{ $final{"^"}[1] } = "^";
      push @out, $final{"^"}[0];
      $caret = undef;
    }

    # vowel(s)
    $t = $tokens->[$i];
    if (defined($t) && $vowel{$t}) {
      push @out, $vowel{a} if !@out;
      push @out, $vowel{$t} unless $t eq "a";
      $i++;
      $vowel_found = $t;
      $vowel_sign = $t unless $t eq "a";
    }

    # plus sign: forces more subjoining
    $t = $tokens->[$i];
    if (defined($t) && $t eq "+") {
      $i++;
      $plus = 1;

      # sanity check: next token must be vowel or subjoinable consonant.  
      $t = $tokens->[$i];
      if (!defined($t) || (!$vowel{$t} && !$subjoined{$t})) {
        push @warns, "Expected vowel or consonant after \"+\"." if $self->{check};
	last MAIN;
      }

      # consonants after vowels doesn't make much sense but process it anyway
      if ($self->{check}) {
	if (!$vowel{$t} && $vowel_sign) {
	  push @warns, "Cannot subjoin consonant ($t) after vowel ($vowel_sign) in same stack.";

	} elsif ($t eq "a" && $vowel_sign) {
	  push @warns, "Cannot subjoin a-chen ($t) after vowel ($vowel_sign) in same stack.";
	}
      }

      redo MAIN;
    }
  }

  # final tokens
  $t = $tokens->[$i];
  while (defined($t) && $final{$t}) {
    my ($uni, $class) = @{ $final{$t} };

    # check for duplicates
    if (defined ($final_found{$class})) {
      if ($final_found{$class} eq $t) {
	push @warns, "Cannot have two \"$t\" applied to the same stack.";
      } else {
	push @warns, "Cannot have \"$t\" and \"$final_found{$class}\" applied to the same stack.";
      }
    } else {
      $final_found{$class} = $t;
      push @out, $uni;
    }

    $i++;
    $single_consonant = undef;
    $t = $tokens->[$i];
  }

  # if next is a dot "." (stack separator), skip it.
  $i++ if (($tokens->[$i] || "") eq ".");

  # if we had more than a consonant and no vowel, and no explicit "+" joining, backtrack and 
  # return the 1st consonant alone
  if ($consonants > 1 && !$vowel_found) {
    if ($plus) {
      push @warns, "Stack with multiple consonants should end with vowel."
        if $self->{check};

    } else {
      $i = $orig_i + 1;
      $consonants = 1;
      $single_consonant = $tokens->[$orig_i];
      @out = ($consonant{$single_consonant});
    }
  }

  # single consonant is single consonant
  $single_consonant = undef if $consonants != 1 || $plus;

  return (
    join("", @out),			# converted unicode string
    $i - $orig_i,			# num of tokens used
    ($vowel_found ? undef : $single_consonant),	# single consonant without vowel
    (($vowel_found && $vowel_found eq "a") ? $single_consonant : undef), # single cons with "a"
    \@warns,				# warnings
    $final_found{ $final{H}[1] },	# visarga
  );
}

# Converts successive stacks of Wylie into unicode, starting at the given index
# within the array of tokens. 
# 
# Assumes that the first available token is valid, and is either a vowel or a consonant.
# 
# Returns a list of:
#  - unicode string
#  - number of tokens used
#  - list of warning strings (arrayref)

sub _from_wylie_one_tsekbar {
  my ($self, $tokens, $i) = @_;

  my $orig_i = $i;
  my $t = $tokens->[$i];

  # variables for tracking the state within the syllable as we parse it
  my ($uni, $toks, $cons, $cons_a, $warns, $prev_cons, $visarga);

  # variables for checking the root letter, after parsing a whole tsekbar made of only single
  # consonants and one consonant with "a" vowel
  my $check_root = 1;
  my @consonants;
  my $root_idx = undef;

  my @out;
  my @warns;

  # the type of token that we are expecting next in the input stream
  #   - prefix : expect a prefix consonant, or a main stack
  #   - main   : expect only a main stack
  #   - suff1  : expect a main stack again, or a 1st suffix
  #   - suff2  : expect a 2nd suffix
  #   - none   : expect nothing (after a 2nd suffix)
  #
  # valid tsek-bars end in one of these states: suff1, suff2, none
  my $state = "prefix";

  # iterate over the stacks of a tsek-bar
STACK: 
  while (defined($t) && ($vowel{$t} || $consonant{$t}) && !$visarga) {
   
    # translate a stack
    $prev_cons = $cons;
    ($uni, $toks, $cons, $cons_a, $warns, $visarga) = 
      $self->_from_wylie_onestack($tokens, $i, $state);
    $i += $toks;
    $t = $tokens->[$i];
    push @out, $uni;
    push @warns, @$warns;

    # no checking?
    next unless $self->{check};

    # check for syllable structure consistency by iterating a simple state machine
    # - prefix consonant
    if ($state eq "prefix" && $cons) {
      push @consonants, $cons;

      if ($prefixes{$cons}) {
	my $next = $self->{check_strict} ? 
		    $self->_consonant_string($tokens, $i) : 
		    ($t || '');
	if ($next ne '' && !$prefixes{$cons}{$next}) {
	  $next =~ tr/+//d;
	  push @warns, "Prefix \"$cons\" does not occur before \"$next\"." 
	}

      } else {
	push @warns, "Invalid prefix consonant: \"$cons\".";
      }
      $state = "main";

    # - main stack with vowel or multiple consonants
    } elsif (!$cons) {

      # looks like that actually does happen in Skt stuff...
      #push @warns, "Cannot have a main stack after a suffix." 
      #  if $state eq "suff2" || $state eq "none";

      $state = "suff1";

      # keep track of the root consonant if it was a single cons with an "a" vowel
      if (defined($root_idx)) {
        $check_root = undef;
      } elsif ($cons_a) {
        push @consonants, $cons_a;
	$root_idx = $#consonants;
      }

    # - unexpected single consonant after prefix
    } elsif ($state eq "main") {
      push @warns, "Expected vowel after \"$cons\".";
      $state = "main";

    # - 1st suffix
    } elsif ($state eq "suff1") {
      push @consonants, $cons;

      # check this one only in strict mode b/c it trips on lots of Skt stuff
      if ($self->{check_strict}) {
	push @warns, "Invalid suffix consonant: \"$cons\"." unless $suffixes{$cons};
      }
      $state = "suff2";

    # - 2nd suffix
    } elsif ($state eq "suff2") {
      push @consonants, $cons;
      if ($suff2{$cons}) {
	push @warns, "Second suffix \"$cons\" does not occur after \"$prev_cons\"."
	  unless $suff2{$cons}{$prev_cons};
      } else {
	push @warns, "Invalid 2nd suffix consonant: \"$cons\".";
      }
      $state = "none";

    # more crap after a 2nd suffix
    } elsif ($state eq "none") {
      push @warns, "Cannot have another consonant \"$cons\" after 2nd suffix.";
    }
  }

  push @warns, "Vowel expected after \"$cons\"." if $state eq "main" && $prefixes{$cons};

  # check root consonant placement only if there were no warnings so far, and the syllable 
  # looks ambiguous.  not many checks are needed here because the previous state machine 
  # already takes care of most illegal combinations.

  if ($self->{check} && !@warns && $check_root && defined($root_idx)) {

    # 2 letters where each could be prefix/suffix: root is 1st
    if (scalar(@consonants) == 2 && $root_idx != 0 &&
        $prefixes{ $consonants[0] }{ $consonants[1] } &&
	$suffixes{ $consonants[1] })
    {
      push @warns, "Syllable should probably be \"$consonants[0]a$consonants[1]\".";

    # 3 letters where 1st can be prefix, 2nd can be postfix before "s" and last is "s":
    # use a lookup table as this is completely ambiguous.
    } elsif (scalar(@consonants) == 3 && $prefixes{ $consonants[0] } &&
	     $suff2{s}{ $consonants[1] } && $consonants[2] eq "s")
    {
      my $cc = join "", @consonants;
      $cc =~ tr/\x{2018}\x{2019}/'/;	# typographical quotes
      my $expect = $ambiguous{$cc};
      if (defined($expect) && $expect->[0] != $root_idx) {
	push @warns, "Syllable should probably be \"$expect->[1]\".";
      }
    }
  }

  my $out = join "", @out;
  return (
    $out,		# converted unicode string
    $i - $orig_i,	# num of tokens used
    \@warns,		# warnings
  );
}

# Generate a warning.  Prints it if required.

sub _warn {
  my ($self, $warn) = @_;

  push @{ $self->{_warns} }, $warn;
  warn "$warn\n" if $self->{print_warnings};
}

1;

=head1 AUTHOR

Roger Espel Llima, E<lt>rogerespel@yahoo.comE<gt>

=head1 COPYRIGHT AND LICENSE

Copyright (C) 2008 by Roger Espel Llima

This library is free software; you can redistribute it and/or modify
it under the same terms as Perl itself, either Perl version 5.8.8 or,
at your option, any later version of Perl 5 you may have available.

=cut

