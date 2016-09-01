#!/usr/bin/perl

use strict;
BEGIN { 
  push @INC, '../lib' if -f '../lib/Lingua/BO/Wylie.pm';
  push @INC, './lib' if -f './lib/Lingua/BO/Wylie.pm';
}

use Lingua::BO::Wylie;
use Getopt::Long;

my ($repeat, $help, $unicode);
GetOptions(
  "unicode"	=> \$unicode,
  "repeat=s"	=> \$repeat,
  "help"	=> \$help,
);

sub help {
  print "This is the command-line interface to the Wylie conversion module.

Use: $0 [options] inputfile outputfile

Converts between Wylie and Unicode, and vice-versa.  All Unicode uses the
UTF-8 encoding.

Options are:
  -u             - convert from Unicode to Wylie.  Otherwise, does the 
                   opposite conversion.
  -r '//'        - also reprint the tibetan before the pronounciation, 
                   separated by '//' (or whatever)
  -h             - get this help

";
  exit 0;
}

help() if $help;

my $wl = new Lingua::BO::Wylie(
  check_strict => 1,
  print_warnings => 0
);

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
  my $out = $unicode ? $wl->to_wylie($in) : $wl->from_wylie($in);
  if ($repeat) {
    chomp($in);
    print OUT "$in\t$out";
  } else {
    print OUT "$out";
  }
}

