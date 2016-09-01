package Lingua::BO::Phonetics::Rigpa;

use strict;
use utf8;

use Carp qw/croak/;
use base qw/Lingua::BO::Phonetics/;

# some stuff is kept around and re-used when multiple Lingua::BO::Phonetics::Rigpa
# objects are loaded.  most importantly we reuse a single copy of the word list.
our (%preloaded_object, %exceptions, $word_list, $wylie_object);

=head1 NAME

Lingua::BO::Phonetics::Rigpa - Perl extension for create approximate phonetics for
Tibetan text, according to Rigpa's usage.

=head1 SYNOPSIS

  use Lingua::BO::Phonetics::Rigpa;
  binmode(STDOUT, ":utf8");

  my $ph = new Lingua::BO::Phonetics();
  print $ph->phonetics("sems can thams cad", autosplit => 1), "\n";

=head1 DESCRIPTION

This module creates approximate phonetics for Tibetan text, according to the standards
used by Rigpa International.

=cut

my %default_opts = (
  middle_nasals		=> 0,
  accent_on_e		=> 1,
  apostrophe_o		=> 1,
  pronounce_suffix	=> { b => 'b' },
  pronounce_consonant	=> { zh => 'shy' },
  suffix_umlaut		=> { l => undef },
  words_file		=> Lingua::BO::Phonetics::_my_dir_file("rigpa_words.txt"),
  exceptions_file	=> Lingua::BO::Phonetics::_my_dir_file("rigpa_exceptions.txt"),
);

my %lang_opts = (
  en => { },
  es => {
    accent_on_e		=> 0,
    pronounce_consonant	=> { 
    	ny => "\xf1",	# use Spanish n-tilde
	zh => 'shy',
    },
    devoice_initials	=> {
        j  => 'ch',
    },
  },
  de => { 
    accent_on_e		=> 0,
  },
);

=head1 METHODS

=head2 CONSTRUCTOR: new (%opts)

To create a new Lingua::BO::Phonetics::Rigpa object, use this method.

Options are:

=over 4

=item - lang

What language phonetics we want.  Valid values so far are "en", "es" and "de".
Default is "en" (English).

=back

Any other options are passed to L<Lingua::BO::Phonetics>.

=cut

sub new {
  my ($self, %opts) = @_;

  my $lang = delete $opts{lang} || 'en';

  # return the preloaded object if we are not being passed any special options
  if (!keys(%opts) && $preloaded_object{$lang}) {
    return $preloaded_object{$lang};
  }

  # combine the global options, the language's options, and the passed options
  %opts = (%default_opts, %{ $lang_opts{$lang} }, %opts);

  # stuff we've already initialized
  $opts{_words}      = $word_list         if $word_list;
  $opts{_exceptions} = $exceptions{$lang} if $exceptions{$lang};
  $opts{_wl}         = $wylie_object      if $wylie_object;

  return $self->SUPER::new(%opts);
}

# Word-splitting; in addition to the word list, we also have some heuristics:
#  - single syllable + pa/ba/po/bo/mo (not "ma" as it is often a negative) makes a word
#  - "ma" + single syllable + pa/ba makes a word (ex. "ma bcos pa")
#  - single syllable + med/ldan/bral/bya/can makes a word, unless followed by pa/ba.

sub _find_word {
  my ($self, $tsek_bars, $start) = @_;

  # how many tsekbars available?
  my $max = scalar(@$tsek_bars) - $start;

  # how many tsekbars would the generic algorithm give us?
  my ($grab, $word) = $self->SUPER::_find_word($tsek_bars, $start);
  return $grab if $self->{_exceptions}{$word};

  # "ma xxx pa/ba"
  return 3
    if $max >= 3 &&
       $grab <= 3 &&
       $tsek_bars->[$start]{wylie} eq 'ma' && 
       $tsek_bars->[$start+2]{wylie} =~ /^[bp]a(?:'i|s|'am|'ang|'o|r)?$/;

  # "xxx pa/ba/po/bo/mo med/ldan/bral/bya/can" not followed by pa/ba/po/bo.
  return 3 
    if $max >= 3 &&
       $grab <= 3 &&
       $tsek_bars->[$start+1]{wylie} =~ /^(?:pa|ba|po|bo|mo)$/ &&
       $tsek_bars->[$start+2]{wylie} =~ /^(?:med|ldan|bral|bya|can)$/ &&
       ($max == 3 || $tsek_bars->[$start+3]{wylie} !~ /^[pb][ao](?:'i|s|'am|'ang|'o|r)?$/);

  # "xxx pa/ba/po/bo/mo".
  # note that we exclude "mos" from being interepreted as a weak syllable, as it is often part
  # of "mos gus" or "mos pa".
  # we also exclude "kyi bar" and "dang bar", since "bar" is here not a la-don-ified "ba".
  return 2
    if $max >= 2 &&
       $grab <= 2 &&
       $tsek_bars->[$start+1]{wylie} =~ /^(?:pa|ba|po|bo|mo(?!s))(?:'i|s|'am|'ang|'o|r)?$/ &&
       ($tsek_bars->[$start+1]{wylie} ne 'bar' || $tsek_bars->[$start]{wylie} !~ /^(?:dang|kyi|gyi|yi|gi)$/);

  # "xxx med/ldan/bral/bya/can" not followed by pa/ba/po/bo.  (xxx cannot be "dang")
  return 2
    if $max >= 2 &&
       $grab <= 2 &&
       $tsek_bars->[$start+1]{wylie} =~ /^(?:med|ldan|bral|bya|can)$/ &&
       $tsek_bars->[$start]{wylie} ne 'dang' &&
       ($max == 2 || $tsek_bars->[$start+2]{wylie} !~ /^[pb][ao](?:'i|s|'am|'ang|'o|r)?$/);

  return $grab;
}

=head1 MODULE INITIALIZATION

Creates a Lingua::BO::Phonetics::Rigpa object at startup, to preload the word lists and
initialize the Wylie converter once and for all.

=cut

{
  my $obj = $preloaded_object{en} = Lingua::BO::Phonetics::Rigpa->new(lang => 'en') || 
    croak "Cannot create initial Lingua::BO::Phonetics::Rigpa object";

  # keep these around, for reuse when we create Phonetics::Rigpa objects for other languages
  $word_list      = $obj->{_words};
  $wylie_object   = $obj->{_wl};
  $exceptions{en} = $obj->{_exceptions};
}

1;

