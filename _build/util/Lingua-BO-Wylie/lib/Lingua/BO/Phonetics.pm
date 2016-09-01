package Lingua::BO::Phonetics;

use 5.008;
use strict;
use utf8;

use Carp qw/croak/;
use Lingua::BO::Wylie;
use File::Spec;

=head1 NAME

Lingua::BO::Phonetics - Perl extension for create approximate phonetics for
Tibetan text.

=head1 SYNOPSIS

  use Lingua::BO::Phonetics;
  binmode(STDOUT, ":utf8");

  my $ph = new Lingua::BO::Phonetics();
  print $ph->phonetics("sems can thams cad", autosplit => 1), "\n";

=head1 DESCRIPTION

This module creates approximate phonetics for Tibetan text, according to 
THL Simplified Phonemic Transcription and other standards, such as those 
used by Rigpa International.

See L<http://www.thlib.org/reference/transliteration/#essay=/thl/phonetics/>
for details on THL's transcription standard.

=cut

our @ISA = ();
our $VERSION = '0.0020090210';
our @EXPORT_OK = ();
our @EXPORT = ();

# XXX 'use fields' breaks on the perl interpreter of www.digitaltibetan.org; reverting to 
#     a regular blessed hashref.
#use fields qw/print_warnings 
#		pronounce_suffix suffix_umlaut pronounce_consonant pronounce_umlaut 
#		pronounce_clusters devoice_initials
#		middle_suffix middle_nasals join_words accent_on_e no_double_g apostrophe_o
#		exceptions_file words_file  
#		_exceptions _words _warns _wl/;

### Various constants and hashes for Tibetan phonetics

# manually import some symbols %tib_top from Wylie.pm
our (%tib_top, %suffixes, %tib_stacks);
*tib_top = \%Lingua::BO::Wylie::tib_top;
*suffixes = \%Lingua::BO::Wylie::suffixes;
*tib_stacks = \%Lingua::BO::Wylie::tib_stacks; 

# how many tsekbars per word max, for word splitting?
use constant MAX_WORD_LENGTH	=> 6;

# superscript => { letter or stack below => 1 }
# (not copied from Wylie.pm b/c of different handling of "lh")
my %superscripts = (
  r	=> { map { $_ => 1 } qw/k g ng j ny t d n b m ts dz k+y g+y m+y b+w ts+w g+w/ },
  l	=> { map { $_ => 1 } qw/k g ng c j t d p b/ },
  s	=> { map { $_ => 1 } qw/k g ng ny t d n p b m ts k+y g+y p+y b+y m+y k+r g+r p+r b+r m+r n+r/ },
);

# umlauting suffixes
my %suffix_umlaut = map { $_ => 1 } qw /d n l s/;

# pronounciation of suffixes (where different from their Wylie representation)
my %pronounce_suffix = (
  g	=> "k",
  b	=> "p",
  d	=> "",
  s	=> "",
  "'"	=> "",
);

# pronounciation of main consonants (when different from wylie)
my %pronounce_consonant = (
  c	=> "ch",
  th	=> "t",
  ph	=> "p",
  tsh	=> "ts",
  "'"	=> "",
  "''"	=> "'",	# used internally for final 'o when the apostrophe should be kept
  a	=> "",
);

# pronounciation of umlauts
my %pronounce_umlaut = (
  a	=> "e",
  o	=> "\x{f6}",		# o umlaut
  u	=> "\x{fc}",		# u umlaut
);

# consonant clusters that change pronounciation
my %pronounce_clusters = (
  py	=> "ch",
  phy	=> "ch",
  by	=> "j",
  my	=> "ny",
  kr	=> "tr",
  pr	=> "tr",
  tr	=> "tr",
  khr	=> "tr",
  phr	=> "tr",
  thr	=> "tr",
  gr	=> "dr",
  br	=> "dr",
  dr	=> "dr",
  nr	=> "n",
  mr	=> "m",
  sr	=> "s",
  kl	=> "l",
  gl	=> "l",
  bl	=> "l",
  rl	=> "l",
  sl	=> "l",
  zl	=> "d",
);

# Defaults for creating a new Lingua::BO::Phonetics object.
my %defaults = (
  print_warnings	=> 1,
  middle_suffix		=> 1,	 # strict THL: 0
  middle_nasals		=> 1,
  join_words		=> 1,
  accent_on_e		=> 1,
  no_double_g		=> undef,
  apostrophe_o		=> undef,
  exceptions_file	=> _my_dir_file("exceptions.txt"),
  words_file		=> _my_dir_file("word_list.txt"),
);

=head1 METHODS

=head2 CONSTRUCTOR: new (%args)

To create a new Lingua::BO::Phonetics object, use the B<new> class method.  

All arguments are optional; arguments include: 

=over 4

=item * print_warnings

(bool) print generated warnings to STDOUT; default is true.

=item * middle_suffix

(bool) allow a consonant in the middle of a tsek-bar to be a suffix, like the "g"
in the abbreviation "bzhugso".  default is true; set it to false to get stricter
THL phonetics.

=item * middle_nasals

(bool) nasalize a-chungs in subsequent syllables, as in "mkha' 'gro'" => "kan dro".
default is true.

=item * join_words

(bool) join the syllables that belong to a single word, as in "khorwa" rather than
"khor wa".

=item * accent_on_e

(bool) whether to put acute accents on final "e" vowels, to avoid English-speakers
mispronouncing them as /i/.

=item * no_double_g

(bool) simplify double "g" before "n", as in "sangye" rather than "sanggye".  Not done
by default.

=item * apostrophe_o

(bool) keep the apostrophe (single quote) in final 'o, e.g produce "denpa'o"
rather than "denpao".

=item * pronounce_suffix

(hashref) an optional hashref of { suffix_consonant => pronounciation }, ex. { b => 'b' }.
Only those that differ from the default need to be specified.

=item * pronounce_consonant

(hashref) an optional hashref of { consonant => pronounciation }, ex. { zh => 'shy' }
to make "zha" become "shya".

=item * pronounce_umlaut

(hashref) an optional hashref of { vowel => umlauted_vowel }, ex. { a => "\xe4" }.

=item * pronounce_clusters

(hashref) an optional hashref of { consonant_cluster => pronounciation }, ex. { by => "ch" }.

=item * suffix_umlaut

(hashref) an optional hashref of { suffix_consonant => boolean }, ex. { l => undef }.  Only 
those suffixes that differ from the default need to be specified.

=item * devoice_initials

(hashref) an optional hashref of { consonant => devoiced_pronounciaton }, ex. { j => 'ch' }.
Provide this if you want initial 2nd-column consonants (g, j, d, b) to be devoiced
when they are not preceded by a prefix or a superscript.  This is not done by default.
Note that this is applied I<after> pronounce_clusters, so if you devoice "j" to
"ch", then "bya" also turns into "cha".

=item * exceptions_file

(string) File containing a list of exceptions to the general phonetics rules.
This should be a text file in utf8, without BOM, with each line containing a
word in Wylie, a tab, and the phonetics.  default is to use the built-in list.

=item * words_file

(string) File containing a list of Tibetan words, for which the syllables need
to be considered together to get the right pronounciation.
This should be a text file in utf8, without BOM, with each line containing
a word in Wylie.  default is to use the built-in list.

=back

=cut

sub new {
  my ($self, %opts) = @_;
  #unless (ref $self) {
  #  $self = fields::new($self);
  #}
  # XXX use fields doesn't work well with subclassing, need to figure out why
  $self = bless { %opts }, $self;

  %$self = (%defaults, %opts);
  $self->{_warns} = [];
  $self->{_wl} ||= new Lingua::BO::Wylie(print_warnings => 0);

  # pronounciation lists: what we are given overrides the defaults
  $self->{pronounce_suffix} = 
    $self->{pronounce_suffix} ?
      { %pronounce_suffix, %{ $self->{pronounce_suffix} } } :
      \%pronounce_suffix;

  $self->{suffix_umlaut} = 
    $self->{suffix_umlaut} ?
      { %suffix_umlaut, %{ $self->{suffix_umlaut} } } :
      \%suffix_umlaut;

  $self->{pronounce_consonant} = 
    $self->{pronounce_consonant} ?
      { %pronounce_consonant, %{ $self->{pronounce_consonant} } } :
      \%pronounce_consonant;

  $self->{pronounce_umlaut} = 
    $self->{pronounce_umlaut} ?
      { %pronounce_umlaut, %{ $self->{pronounce_umlaut} } } :
      \%pronounce_umlaut;

  $self->{pronounce_clusters} = 
    $self->{pronounce_clusters} ?
      { %pronounce_clusters, %{ $self->{pronounce_clusters} } } :
      \%pronounce_clusters;

  $self->{devoice_initials} = $self->{devoice_initials} || {};

  # load the words for word splitting
  if (defined($self->{words_file}) && !$self->{_words}) {
    open WO, "<:utf8", $self->{words_file} 
      or croak "Cannot open word list $self->{words_file}: $!";

    while (defined(my $l = <WO>)) {
      $l =~ s/^\s+|\s+$//g;
      $l =~ s/\x{feff}//g;
      $l =~ s/\#.*//;
      $self->{_words}{$l} = 1 if $l;
    }
    close WO;

  } else {
    $self->{_words} ||= {};
  }

  # ... and load the exceptions
  if (defined($self->{exceptions_file}) && !$self->{_exceptions}) {
    open EX, "<:utf8", $self->{exceptions_file} 
      or croak "Cannot open exceptions file $self->{exceptions_file}: $!";

    while (defined(my $l = <EX>)) {
      $l =~ s/^\s+|\s+$//g;
      $l =~ s/\x{feff}//g;
      $l =~ s/\#.*//;
      my ($word, $pron) = split /\t/, $l;
      next unless $word && $pron;
      $self->{_exceptions}{$word} = $pron;
      $self->{_words}{$word} = 1;
    }
    close EX;

  } else {
    $self->{_exceptions} ||= {};
  }

  return $self;
}

=head2 get_warnings ()

Retrieve the list of warnings generated from the previous phonetics call.

Returns: an arrayref with one line per warning.

=cut

sub get_warnings {
  my ($self) = @_;
  return $self->{_warns} || [];
}

=head2 phonetics ($string, %args)

Creates Tibetan phonetics.  

$string can be either Unicode or Wylie; it will be converted from Wylie if it
doesn't include any main characters from the Tibetan Unicode set, and has
alphanumerics.

%args include:

=over 4

=item * joiner

The character or string used to B<join syllables> that belong to a word, or undef.

Tibetan in Wylie with syllables joined with "-" looks like this:
  sangs-rgyas dang byang-chub-sems-dpa' thams-cad la phyag-'tshal-lo

=item * separator

The character or string used to B<separate syllables> that don't belong to a word,
or undef.  You cannot have a joiner and a separator at the same time.

Tibetan in Wylie with words separated with "/" looks like this:
  sangs rgyas / dang / byang chub sems dpa' / thams cad / la / phyag 'tshal lo

=item * autosplit

Automatically split into words using a built-in word list.  This is incompatible 
with both joiner and separator.

=back

If neither of these are specified, then each syllable will be handled separately.

Note that if the input is Wylie, then the joiner or separator should be Wylie, and
if the input is Unicode, then the joiner or separator should be Unicode too.

=cut

sub phonetics {
  my ($self, $str, %args) = @_;
  my ($joiner, $separator, $autosplit, $caps) = @args{qw/joiner separator autosplit caps/};

  # so we can test it for "defined" along w/ the others...
  $autosplit = undef if !$autosplit;

  if (scalar(grep { defined $_ } ($joiner, $separator, $autosplit)) > 1) {
    croak("Can only have one of 'joiner', 'separator' and 'autosplit'.");
  }

  my @out;
  my $units;
  my $line = 1;
  my ($toks, $out, $warns, $stacks);

  # Possibly convert from Wylie, and clean-up.
  # Internal representation: tsekbars (potentially) belonging to a single word are
  # separated by non-breaking tseks.
  ($str, $warns) = $self->_prepare_string($str, $joiner, $separator, $autosplit, $caps);
  foreach my $w (@$warns) {
    $self->_warn($w);
  }

  # split into codepoints
  my @tokens = split //, $str;
  my $i = 0;
  my $t;

  # loop over runs of tibetan writing and single tseks (i.e comes back here after finding
  # a shad, newline, a space, or any other punctuation or line noise)
ITER:
  while (defined($t = $tokens[$i])) {

    # newlines, count lines.  "\r\n" together count as one newline.
    if ($t eq "\n" || $t eq "\r") {
      $line++;
      $i++;

      # remove trailing space
      pop @out if @out && $out[$#out] eq ' ';
      push @out, $t;

      if ($t eq "\r" && ($tokens[$i] || '') eq "\n") {
	$i++;
	push @out, "\n";
      }
      next ITER;
    }

    # pass "@" along, it is internally used to mark capitalization
    if ($t eq '@') {
      push @out, $t;
      ++$i;
      next ITER;
    }


    # skip other non-tibetan
    if (!$tib_top{$t}) {
      ++$i;
      next ITER;
    }

    my @tsek_bars = ();

    # split into as many successive tsekbars as we can find, separated by single 
    # non-breaking tseg only (i.e candidates for being a single word)
    TSEKS: while (defined($t = $tokens[$i]) && $tib_top{$t}) {

      ($toks, $out, $warns, $stacks) = $self->{_wl}->_to_wylie_one_tsekbar(\@tokens, $i);
      $i += $toks;
      $units++;
      foreach my $w (@$warns) {
	$self->_warn(qq{line $line: $w});
      }
      push @tsek_bars, {
	stacks	=> $stacks,
	wylie	=> $out,
      };

      # skip a non-breaking tsek 
      if (($t = $tokens[$i]) && $t eq "\x{f0c}") {
	$i++;
      }
    }

    # now, group these tsekbars into words
    my $j = 0;
    while ($j <= $#tsek_bars) {

      # group into words using the automatic splitter, or just take it all together
      my $grab = $autosplit ? 
		    $self->_find_word(\@tsek_bars, $j) :
		    scalar(@tsek_bars);

      my @process = @tsek_bars[$j .. $j + $grab - 1];
      $j += $grab;

      my ($pron, $warns) = $self->_pronounce_processed_word(\@process);
      push @out, $pron, ' ';
      foreach my $w (@$warns) {
	$self->_warn(qq{line $line: $w});
      }
    }
  }

  $self->_warn(qq{No Tibetan text found!}) unless $units;

  # put it together, remove trailing spaces and capitalize as needed
  my $ret = join '', @out;
  $ret =~ s/ +$//g;
  $ret =~ s/\@(\w)/uc($1)/ge;
  $ret =~ s/\@//g;
  return $ret;
}

# INTERNAL FUNCTIONS

# Get the full pathname for a file which resides in the same dir as this module
sub _my_dir_file {
  my $fn = shift;
  my ($vol, $dir, $file) = File::Spec->splitpath(__FILE__);
  return File::Spec->catpath($vol, $dir, $fn);
}

# Convert a Tibetan string (either Wylie or Unicode) to the internal
# representation in Unicode, using normal tseks for hard word breaks, and non
# breaking tseks for syllables (presumably) belonging to the same word.

sub _prepare_string {
  my ($self, $str, $joiner, $separator, $autosplit, $caps) = @_;
  my @warns;

  # internally, the caps marker always becomes an "@"
  if (defined($caps) && $caps ne '') {
    $str =~ s/\Q$caps\E/\@/g;
  }

  # convert from Wylie if it doesn't look like tibetan unicode...
  if ($str !~ /[\x{f40}-\x{f6a}]/ && $str =~ /[a-zA-Z]/) {

    $separator = ' ' unless grep { defined $_ } ($joiner, $separator, $autosplit);

    if (defined($joiner)) {
      unless ($joiner eq '*') {
	$str =~ s/\*/ /g;
	$str =~ s/\Q$joiner\E/\*/g;
      }

    } elsif (defined $separator) {
      unless ($separator eq ' ') {
	$str =~ s/ /\*/g;
	$str =~ s/\Q$separator\E/ /g;
      }

    } elsif ($autosplit) {
      $str =~ s/ /\*/g;

    } else {
      $str =~ s/\*/ /g;
    }

    $str = $self->{_wl}->from_wylie($str, keep => '@');
    push @warns, @{ $self->{_wl}->get_warnings() };

  } else {
    $str = $self->_cleanup_unicode($str);

    $separator = "\x{f0b}" unless grep { defined $_ } ($joiner, $separator, $autosplit);

    if (defined($joiner)) {
      unless ($joiner eq "\x{f0c}") {
	$str =~ s/\x{f0c}/\x{f0b}/g;
	$str =~ s/\Q$joiner\E/\x{f0c}/g;
      }

    } elsif (defined $separator) {
      unless ($separator eq "\x{f0b}") {
	$str =~ s/\x{f0b}/\x{f0c}/g;
	$str =~ s/\Q$separator\E/\x{f0b}/g;
      }

    } elsif ($autosplit) {
      $str =~ s/\x{f0b}/\x{f0c}/g;
    
    } else {
      $str =~ s/\x{f0c}/\x{f0b}/g;
    }
  }

  return ($str, \@warns);
}

# Find out how many tsekbars should we grab together to form a word, using a greedy
# algorithm.

sub _find_word {
  my ($self, $tsek_bars, $start) = @_;
  my $word;

  # how many tsekbars can we grab at most?  our word list has max 4 tsekbars per word
  my $grab = scalar(@$tsek_bars) - $start;
  $grab = MAX_WORD_LENGTH if $grab > MAX_WORD_LENGTH;

TRY:
  for (; $grab > 1; $grab--) {

    # do these tsekbars together make a word?
    $word = join ' ', map { $_->{wylie} } @$tsek_bars[$start .. $start + $grab - 1];
    last TRY if $self->{_words}{$word};

    # or is it a derived word?  
    # ex. 'khor 'ba'i, 'khor 'bas, 'khor ba'am, 'khor ba'ang, 'khor ba'o, 'khor bar
    if ($word =~ s/([aeiou])(?:'i|s|'am|'ang|'o|r)$/$1/) {
      last TRY if $self->{_words}{$word};
      last TRY if $self->{_words}{$word . "'"};
    }
  }

  $word = $tsek_bars->[$start]{wylie} if $grab == 1;
  return wantarray ? ($grab, $word) : $grab;
}

# Check for a standard tibetan syllable, comprised of one main stack (w/ prefixes & suffixes
# as appropriate), optionally followed by up to two stacks with an a-chung, an optional 
# vowel, and possibly a suffix on the last one.
# 
# At this point, prefixes & suffixes have been merged into the stack they attach to.

sub _check_standard {
  my ($self, $stacks) = @_;

  # at most 3 stacks
  return undef if scalar(@$stacks) > 3;

  # check the stack on the 1st one 
  my $st1 = join '+', @{ $stacks->[0]{stack} };
  return undef if $st1 =~ /\+/ && !$tib_stacks{$st1};

  # no multiple vowels anywhere
  foreach my $s (@$stacks) {
    return undef if scalar(@{ $s->{vowels} }) > 1;
  }

  # no visargas, anusvaras or halantas on non-final stacks; no halantas at the end either
  foreach my $s (@$stacks[0 .. $#$stacks - 1]) {
    return undef if $s->{finals_found}{M} || $s->{finals_found}{H} || $s->{finals_found}{"?"};
  }
  return undef if $stacks->[$#$stacks]{finals_found}{"?"};

  # only achung-vowels in the middle
  foreach my $s (@$stacks[1 .. $#$stacks - 1]) {
    return undef unless scalar(@{ $s->{stack} }) == 1 && $s->{stack}[0] eq "'" && !$s->{has_suffix};
  }

  # only achung-vowels + optional suffix at the end 
  if (scalar(@$stacks) > 1) {
    my $s = $stacks->[$#$stacks];
    return undef unless scalar(@{ $s->{stack} }) == 1 && $s->{stack}[0] eq "'";
  }

  1;
}

# Cleans up tibetan unicode, replacing precombined characters with their
# combinations.

sub _cleanup_unicode {
  my ($self, $str) = @_;

  # globally search and replace some deprecated pre-composed Sanskrit vowels
  $str =~ s/\x{f76}/\x{fb2}\x{f80}/g;
  $str =~ s/\x{f77}/\x{fb2}\x{f71}\x{f80}/g;
  $str =~ s/\x{f78}/\x{fb3}\x{f80}/g;
  $str =~ s/\x{f79}/\x{fb3}\x{f71}\x{f80}/g;
  $str =~ s/\x{f81}/\x{f71}\x{f80}/g;

  # ... and pre-composed dh, gh, etc
  $str =~ s/\x{f43}/\x{f42}\x{fb7}/g;
  $str =~ s/\x{f4d}/\x{f4c}\x{fb7}/g;
  $str =~ s/\x{f52}/\x{f51}\x{fb7}/g;
  $str =~ s/\x{f57}/\x{f56}\x{fb7}/g;
  $str =~ s/\x{f5c}/\x{f5b}\x{fb7}/g;
  $str =~ s/\x{f69}/\x{f40}\x{fb5}/g;
  $str =~ s/\x{f93}/\x{f92}\x{fb7}/g;
  $str =~ s/\x{f9d}/\x{f9c}\x{fb7}/g;
  $str =~ s/\x{fa2}/\x{fa1}\x{fb7}/g;
  $str =~ s/\x{fa7}/\x{fa6}\x{fb7}/g;
  $str =~ s/\x{fac}/\x{fab}\x{fb7}/g;
  $str =~ s/\x{fb9}/\x{f90}\x{fb5}/g;

  $str;
}

# Create the phonetics for a single Tibetan word, given as a set of analyzed tsekbars.

sub _pronounce_processed_word {
  my ($self, $tsek_bars) = @_;
  my $i = 0;
  my @out;
  my @warns;

  # put together the Wylie
  my $wylie = join ' ', map { $_->{wylie} } @$tsek_bars;

  # is this an exceptional pronounciation from the exceptions list?
  if (defined $self->{_exceptions}{$wylie}) {
    my $word = $self->{_exceptions}{$wylie};
    return $word;
  }

  # or is it a derived word?  manually do derivations from the exceptions list.
  if ($wylie =~ s/([aeiou])(\'i|s|'am|'ang|'o|r)$/$1/ && 
      defined($self->{_exceptions}{$wylie})) 
  {
    my $add = $2;
    my $pron = $self->{_exceptions}{$wylie};
    if ($add eq "'i" || $add eq "s") {
      $pron =~ s/([aou])$/$self->{pronounce_umlaut}{$1}/e;
    } elsif ($add eq "'am") {
      $pron .= "a" unless $pron =~ /a$/;
      $pron .= "m";
    } elsif ($add eq "'ang") {
      $pron .= "a" unless $pron =~ /a$/;
      $pron .= "ng";
    } elsif ($add eq "'o") {
      if ($self->{apostrophe_o}) {
        $pron .= "'o"
      } else {
	$pron .= "o" unless $pron =~ /o$/;
      }
    } elsif ($add eq "r") {
      $pron .= "r";
    }
    $pron =~ s/ //g 	 if $self->{join_words};
    $pron =~ s/e$/\x{e9}/ if $self->{accent_on_e}; 
    return $pron;
  }

  # loop over the tsekbars in the word
  for ($i = 0; $i <= $#$tsek_bars; $i++) {
    my $stacks = $tsek_bars->[$i]{stacks};

    # drop the prefix as a separate unit, but keep track of it in the main stack
    if ($stacks->[0]{prefix}) {
      $stacks->[1]{has_prefix} = $stacks->[0]{single_cons};
      shift @$stacks;
    }

    # optional: also allow the 2nd to be a suffix if a full stack comes after it
    # (ex. "bzhugso")
    if ($self->{middle_suffix} && 
        scalar(@$stacks) >= 3 &&
        !$stacks->[1]{suffix} && !$stacks->[2]{suffix} &&
        $stacks->[1]{single_cons} &&
        $suffixes{ $stacks->[1]{single_cons} })
    {
      $stacks->[1]{middle_suffix} = 1;
    }

    # drop the suffix & 2nd suffix as a separate unit, but keep track of the suffix
    if ($stacks->[$#$stacks]{suff2}) {
      pop @$stacks;
    }

    if ($stacks->[$#$stacks]{suffix}) {
      my $suff = $stacks->[$#$stacks]{single_cons};
      pop @$stacks;
      my $s = $stacks->[$#$stacks];

      # pronounce the suffix, keep track of umlauting
      $s->{has_umlaut} = $suff 
        if $self->{suffix_umlaut}{$suff};
      $suff = defined($self->{pronounce_suffix}{$suff}) ? $self->{pronounce_suffix}{$suff} : $suff;
      $stacks->[$#$stacks]{has_suffix} = $suff if $suff ne '';
    }

    # handle final 'i and 'o in a special way:
    if (scalar(@$stacks) > 1 &&
        $stacks->[$#$stacks]{cons_str} eq "'" &&
        scalar(@{ $stacks->[$#$stacks]{vowels} }) == 1 &&
	!@{ $stacks->[$#$stacks]{finals} })
    {
      my $vowel = $stacks->[$#$stacks]{vowels}[0];

      # final 'i is removed as a separate stack, but sets the prev stack for umlauting
      if ($vowel eq 'i') {
	pop @$stacks;
	$stacks->[$#$stacks]{has_umlaut} = "'i";
      }

      # with final 'o, the apostrophe is kept (if requested).  internally we change the
      # consonant string to "''".
      if ($vowel eq 'o' && $self->{apostrophe_o}) {
        $stacks->[$#$stacks]{cons_str} = "''";
      }

    }

    # check for a standard looking syllable
    my $standard_syllable = $self->_check_standard($stacks) || 0;

    # in all stacks (there can be several...):
    foreach my $s (@$stacks) {

      # split the consonants for processing...
      my @c = split /\+/, $s->{cons_str};

      # no wazurs, thanks!
      if (scalar(@c) > 1 && $c[$#c] eq 'w') {
        pop @c;
      }

      # remove superscripts...
      if (scalar(@c) > 1) {
        my $first = $c[0];
        my $rest  = join '+', @c[1 .. $#c];
        if ($superscripts{$first}{$rest}) {
	  $s->{has_superscripts} = $first;
	  shift @c;
	}
      }

      # special rules for dba => wa, dbo => wo, dbya => ya, dbra => ra, dbu => u...
      if ($s->{has_prefix} && $s->{has_prefix} eq 'd' && $c[0] eq 'b') {
        if ((@{ $s->{vowels} } && $s->{vowels}[0] eq 'u') ||
	    ($c[1] && ($c[1] eq 'y' || $c[1] eq 'r')))
	{
	  shift @c;
	} else {
	  $c[0] = "w";
	}
      }

      # change ba => wa, bo => wo in the 2nd and further tsekbars; also with "-r" suffix
      if ($standard_syllable && $i > 0 &&
          !$s->{has_prefix} && $s->{cons_str} eq 'b' &&
          (!@{ $s->{vowels} } || $s->{vowels}[0] =~ /a|o/) &&
	  $c[0] eq "b" &&
	  (!$s->{has_suffix} || $s->{has_suffix} eq 'r'))
      {
        $c[0] = "w";
      }

      # consonant clusters: phya => cha, etc
      if (scalar(@c) > 1) {
        my $cc = join '', @c[0, 1];
	if ($self->{pronounce_clusters}{$cc}) {
	  splice @c, 0, 2, $self->{pronounce_clusters}{$cc};
	}
      }

      # (optionally) devoice initials, ex. "cha" => "ja".
      if (@c && !$s->{has_prefix} && !$s->{has_superscripts} && $self->{devoice_initials}{ $c[0] }) {
        $c[0] = $self->{devoice_initials}{ $c[0] };
      }

      # fix consonant pronounciation
      @c = grep { $_ ne '' }
           map { defined($self->{pronounce_consonant}{$_}) ? $self->{pronounce_consonant}{$_} : lc $_ }
	   @c;

      # put it back, without plusses
      $s->{cons_pronounce} = join '', @c;

      # 2nd syllable nasalisations...
      if ($self->{middle_nasals} && $#$stacks == 0 && $#$tsek_bars > $i) {
        my $next = $tsek_bars->[$i + 1];

	# 1) a-chung prefix produces a nasal suffix in the prev syllable
	if ($next->{stacks}[0]{prefix} && $next->{stacks}[0]{single_cons} eq "'") {
	  my $cons = $next->{stacks}[1]{cons_str};
	  if ($cons eq "b" || $cons eq "ph") {
	    $s->{has_suffix} = "m";
	  } else {
	    $s->{has_suffix} = "n";
	  }

	# 2) m prefix produces an m suffix, unless there was already a nasal suffix
	} elsif ($next->{stacks}[0]{prefix} && $next->{stacks}[0]{single_cons} eq 'm') {
	  $s->{has_suffix} = 'm'
	    unless $s->{has_suffix} && $s->{has_suffix} =~ /^(?:m|n|ng)$/;

	# 3) l superscript in ld, lt, lj produces an n suffix.  same with zl.
	} elsif ($next->{stacks}[0]{cons_str} =~ /^l\+(?:d|t|j)(?:\+|$)/ ||
		 $next->{stacks}[0]{cons_str} =~ /^z\+l(?:\+|$)/) {
	  $s->{has_suffix} = 'n'
	    unless $s->{has_suffix} && $s->{has_suffix} =~ /^(?:m|n|ng)$/;
	}

      }

      # put the vowel
      $s->{vowel_pronounce} = lc ($s->{vowels}[0] || "a");
      if ($s->{has_umlaut}) {
        $s->{vowel_pronounce} = $self->{pronounce_umlaut}{ $s->{vowel_pronounce} } || $s->{vowel_pronounce};
      }
      $s->{vowel_pronounce} = '' if $s->{middle_suffix};
      
      # finals?
      if (grep { /M/ } @{ $s->{finals} }) {
        $s->{final_pronounce} = 'm';
      } elsif (grep { /H/ } @{ $s->{finals} }) {
        $s->{final_pronounce} = 'h';
      }
      $s->{vowel_pronounce} = '' if grep { /\?/ } @{ $s->{finals} };

      push @out, $s->{cons_pronounce} if $s->{cons_pronounce};
      push @out, $s->{vowel_pronounce} if $s->{vowel_pronounce};
      push @out, $s->{has_suffix} if $s->{has_suffix};
      push @out, $s->{final_pronounce} if $s->{final_pronounce};
    }

    if (!$standard_syllable && !$self->{_words}{$wylie}) {
      push @out, "(?)";
      my $wy = $tsek_bars->[$i]{wylie};
      push @warns, qq{Dubious syllable: "$wy".};
    }

    push @out, " " unless $self->{join_words};
  }

  my $out = join '', @out;
  $out =~ s/ $//;

  # remove duplicate vowels
  $out =~ s/([aeiou])\1/$1/g;

  # sanggye => sangye (and similar...)
  $out =~ s/ngg/ng/g if $self->{no_double_g};

  # put accents on final "e"
  $out =~ s/e($|\()/\x{e9}$1/ if $self->{accent_on_e}; 

  return ($out, \@warns);
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

