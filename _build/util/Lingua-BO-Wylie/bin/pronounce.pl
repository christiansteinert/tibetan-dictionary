#!/usr/bin/perl

use strict;
BEGIN { 
  push @INC, '../lib' if -f '../lib/Lingua/BO/Phonetics.pm';
  push @INC, './lib' if -f './lib/Lingua/BO/Phonetics.pm';
}

use Lingua::BO::Phonetics;
use Getopt::Long;

my ($style, $repeat, $joiner, $separator, $autosplit, $caps, $help);
GetOptions(
  "style=s"	=> \$style,
  "repeat=s"	=> \$repeat,
  "joiner=s"	=> \$joiner,
  "separator=s"	=> \$separator,
  "autosplit"	=> \$autosplit,
  "caps=s"	=> \$caps,
  "help"	=> \$help,
);

sub help {
  print "This is the command-line interface to the Tibetan Phonemic converter.

Use: $0 [options] inputfile outputfile

The input file can be in Wylie or Tibetan Unicode.  If it is Unicode, it should
be encoded in UTF-8.

Options are:
  -s style-name  - which phonemic system to use; the default is THL.
                   The other available style is 'rigpa-en'.
  -r '//'        - also reprint the tibetan before the pronounciation, 
                   separated by '//' (or whatever)
  -j '-'         - use '-' (or whatever character) to mark syllables belonging 
                   to a single word
  -sep ' '       - use ' ' (or whatever) to separate syllables belonging to 
                   different words
  -a             - auto-split words based on a small built-in dictionary
  -c '*'         - use '*' (or whatever) to mark words to be capitalized
  -h             - get this help

Only one of -j, -sep or -a can be given.  Default is auto-split.
";
  exit 0;
}

help() if $help;

if (defined($joiner) + defined($separator) + defined($autosplit) > 1) {
  die "At most one of -j, -sep or -a can be given.\n";
}
my %pho_args;
if (defined($joiner)) {
  $pho_args{joiner} = $joiner;
} elsif (defined($separator)) {
  $pho_args{separator} = $separator;
} else {
  $pho_args{autosplit} = 1;
}

my %new_args = (print_warnings => 0);
if ($style && $style eq 'rigpa-en') {
  $new_args{middle_nasals} = 0;
  $new_args{zh_is_shy} = 1;
  $new_args{l_umlauts} = 0;
  $new_args{words_file} = Lingua::BO::Phonetics::_my_dir_file("rigpa_words.txt");
  $new_args{exceptions_file} = Lingua::BO::Phonetics::_my_dir_file("rigpa_exceptions.txt");
}

my $pho = new Lingua::BO::Phonetics(%new_args);
my ($infile, $outfile) = @ARGV[0, 1];

help() if !defined($infile) || !defined($outfile);

if ($infile eq '-') {
  *IN = *STDIN;
} else {
  open IN, "<", $infile or die "Cannot read $infile.";
}
if ($outfile eq '-') {
  *OUT = *STDOUT;
} else {
  open OUT, ">", $outfile or die "Cannot write to $outfile.";
}
binmode(IN, ":utf8");
binmode(OUT, ":utf8");

while(defined(my $in = <IN>)) {
  my $out = $pho->phonetics($in, %pho_args);
  if ($repeat) {
    chomp($in);
    print OUT "$in\t$out";
  } else {
    print OUT "$out";
  }
}

